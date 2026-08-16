import { Injectable } from '@nestjs/common';
import type { LeaveApprovedPayload, LeaveRejectedPayload, MessageSentPayload } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { RecipientsService } from './recipients.service';
import { LinePushClient } from './line-push.client';

// LINE 推播（Step 5，best-effort + BullMQ 重試）。**只推重點事件**（Human Owner 決策）：
//   LeaveApproved / LeaveRejected → 通知家長;MessageSent → 通知家長+老師（排除發訊者）。
// 其餘事件（LeaveSubmitted / LeaveCancelled / AnnouncementPublished / AttendanceMarked）只留站內、不推 LINE。
// 收件人沿用 RecipientsService（與站內通知一致）;userId → lineUserId 由 LineIdentity 對映;
// 未綁 LINE（無 LineIdentity）或無 token 者自動略過。
// 推播文字（帶學生姓名,讓家長一眼看出是哪個小孩）。
const PUSH_TEXT: Record<string, (studentName: string) => string> = {
  LeaveApproved: (name) => `${name} 的請假申請已核准。`,
  LeaveRejected: (name) => `${name} 的請假申請未通過，請開啟應用程式查看詳情。`,
  MessageSent: (name) => `${name} 有一則新訊息，請開啟應用程式查看。`,
};

@Injectable()
export class PushNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: RecipientsService,
    private readonly client: LinePushClient,
  ) {}

  // 依事件型別推播。非重點事件 → no-op。失敗丟出 → BullMQ 重試。
  async push(eventType: string, payload: unknown): Promise<void> {
    const build = PUSH_TEXT[eventType];
    if (!build) {
      return; // 非重點事件 → 不推
    }
    const studentId = (payload as { studentId?: string }).studentId;
    const text = build(await this.studentName(studentId));
    const userIds = await this.recipientsFor(eventType, payload);
    const lineUserIds = await this.lineIdsFor(userIds);
    for (const to of lineUserIds) {
      await this.client.push(to, text);
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
