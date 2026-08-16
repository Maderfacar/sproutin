import { Injectable, Logger } from '@nestjs/common';
import type {
  AnnouncementPublishedPayload,
  CommunicationBookPublishedPayload,
  LeaveApprovedPayload,
  LeaveRejectedPayload,
  MessageSentPayload,
} from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { RecipientsService } from './recipients.service';
import { LinePushClient, LinePushError } from './line-push.client';

// LINE 推播（Step 5，best-effort + BullMQ 重試）。**只推重點事件**（Human Owner 決策）：
//   LeaveApproved / LeaveRejected → 通知家長;MessageSent → 通知家長+老師（排除發訊者）;
//   **AnnouncementPublished → 通知公告對象**（階段2 刀5 加入;園所發公告時家長 LINE 立即收到）。
// 其餘事件（LeaveSubmitted / LeaveCancelled / AttendanceMarked）只留站內、不推 LINE。
// 收件人沿用 RecipientsService（與站內通知一致）;userId → lineUserId 由 LineIdentity 對映;
// 未綁 LINE（無 LineIdentity）或無 token 者自動略過。
// 推播文字（帶學生姓名,讓家長一眼看出是哪個小孩）。
const PUSH_TEXT: Record<string, (studentName: string) => string> = {
  LeaveApproved: (name) => `${name} 的請假申請已核准。`,
  LeaveRejected: (name) => `${name} 的請假申請未通過，請開啟應用程式查看詳情。`,
  MessageSent: (name) => `${name} 有一則新訊息，請開啟應用程式查看。`,
};

const ANNOUNCEMENT_EVENT = 'AnnouncementPublished';
const BOOK_EVENT = 'CommunicationBookPublished';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger('PushNotification');

  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: RecipientsService,
    private readonly client: LinePushClient,
  ) {}

  // 依事件型別推播。非重點事件 → no-op。失敗丟出 → BullMQ 重試。
  async push(eventType: string, payload: unknown): Promise<void> {
    if (eventType === ANNOUNCEMENT_EVENT) {
      return this.pushAnnouncement(payload as AnnouncementPublishedPayload);
    }

    if (eventType === BOOK_EVENT) {
      return this.pushCommunicationBook(payload as CommunicationBookPublishedPayload);
    }

    const build = PUSH_TEXT[eventType];
    if (!build) {
      return; // 非重點事件 → 不推
    }
    const studentId = (payload as { studentId?: string }).studentId;
    const text = build(await this.studentName(studentId));
    const userIds = await this.recipientsFor(eventType, payload);
    await this.sendTo(userIds, text);
  }

  // 公告推播：文字帶公告標題（家長不必開 App 就知道是什麼事）。
  // 對象與站內通知一致——全校公告→全體;班級公告→該班老師 + 該班學生家長。
  // 公告已刪除（查無標題）→ 不推，避免推出空洞訊息。
  private async pushAnnouncement(payload: AnnouncementPublishedPayload): Promise<void> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: payload.announcementId },
      select: { title: true },
    });
    if (!announcement) {
      return;
    }
    const scopeLabel = payload.classId ? '班級公告' : '全校公告';
    const text = `【${scopeLabel}】${announcement.title}`;

    const userIds = payload.classId
      ? await this.recipients.forClass(this.prisma, payload.classId)
      : await this.recipients.allUsers(this.prisma);
    await this.sendTo(userIds, text);
  }

  // 每日聯絡簿送出：**只推老師明確勾選的學生**（pushStudentIds），其餘只留站內通知。
  // 動機（Human Owner 決策 2026-08-17）：日常記錄若全班推播，一班 25 人每天就是 25 則 LINE
  // 訊息，費用與打擾都不成比例；老師遇到健康需注意等情況才選擇即時通知。
  // 推播文字帶學生姓名，家長一眼看出是哪個小孩。
  private async pushCommunicationBook(payload: CommunicationBookPublishedPayload): Promise<void> {
    if (payload.pushStudentIds.length === 0) {
      return;
    }
    for (const studentId of payload.pushStudentIds) {
      const name = await this.studentName(studentId);
      const r = await this.recipients.forStudent(this.prisma, studentId);
      await this.sendTo(r.guardians, `${name} 今日的聯絡簿已更新，請開啟應用程式查看。`);
    }
  }

  // 逐一推播，**單一收件人失敗不得拖垮其他人**（2026-08-17 線上教訓：
  // demo 種子帶假 LINE ID，LINE 回 400 'to' is invalid，原本的迴圈在第一個假 ID 就中斷，
  // 排在後面的真實收件人永遠收不到，且每次重試都卡在同一處）。
  //   4xx＝這個收件人永遠不會成功（無效 ID / 封鎖 OA）→ 記錄後跳過，不重試。
  //   5xx / 網路＝暫時性 → 迴圈結束後丟出，交由 BullMQ 重試整個 job（at-least-once：
  //   已成功者可能收到重複訊息，取捨上優於整批漏發）。
  private async sendTo(userIds: string[], text: string): Promise<void> {
    const lineUserIds = await this.lineIdsFor(userIds);
    let transientError: unknown = null;

    for (const to of lineUserIds) {
      try {
        await this.client.push(to, text);
      } catch (error: unknown) {
        if (error instanceof LinePushError && error.status >= 400 && error.status < 500) {
          this.logger.warn(`略過收件人（LINE 拒絕，HTTP ${error.status}）：${error.body}`);
          continue;
        }
        transientError = error;
      }
    }

    if (transientError) {
      throw transientError;
    }
  }

  // 取學生姓名供推播文字使用;查無（極少數,如已刪除）→ 回退「學生」。
  private async studentName(studentId?: string): Promise<string> {
    if (!studentId) {
      return '學生';
    }
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    return student?.name ?? '學生';
  }

  // 推播收件人（與站內通知同源:RecipientsService）。
  private async recipientsFor(eventType: string, payload: unknown): Promise<string[]> {
    if (eventType === 'MessageSent') {
      const p = payload as MessageSentPayload;
      const r = await this.recipients.forStudent(this.prisma, p.studentId);
      return [...r.guardians, ...r.teachers].filter((id) => id !== p.senderId);
    }
    // LeaveApproved / LeaveRejected → 通知家長。
    const p = payload as LeaveApprovedPayload | LeaveRejectedPayload;
    const r = await this.recipients.forStudent(this.prisma, p.studentId);
    return r.guardians;
  }

  // userId → LINE userId（LineIdentity;僅認證用途，此處作為推播定址）。未綁定者自動被濾除。
  private async lineIdsFor(userIds: string[]): Promise<string[]> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) {
      return [];
    }
    const identities = await this.prisma.lineIdentity.findMany({
      where: { userId: { in: unique } },
      select: { lineUserId: true },
    });
    return identities.map((i) => i.lineUserId);
  }
}
