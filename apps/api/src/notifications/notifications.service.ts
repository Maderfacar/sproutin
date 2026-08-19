import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { collectIds, payloadId, summarize, type SummaryLookups } from './notification-summary';

// Notification 讀取端（Derived;寫入端由 Step 3 事件 handler 產生）。
// 授權：使用者只能讀/改**自己的**通知（filter userId=actor.id）—— 不需 ScopeResolver。
export interface NotificationActor {
  id: string;
}

// 「只要跟我監護的小孩有關的那些」。與 GET /me/students?relation=GUARDIAN 同一個字，
// 因為講的是同一件事：前端切到家長身分之後，這個人只該看到家長那一半的世界。
export type NotificationRelationScope = 'GUARDIAN';

export interface NotificationView {
  id: string;
  type: string;
  payload: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
  // 訊息中心用的人話（讀取時 join，不寫回 payload;見 notification-summary.ts）。
  title: string;
  subtitle: string;
}

const NOTIFICATION_VIEW = {
  id: true,
  type: true,
  payload: true,
  readAt: true,
  createdAt: true,
} as const;

type NotificationRow = {
  id: string;
  type: string;
  payload: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /notifications?unread=true&relation=GUARDIAN — 本人通知（預設全部;unread=true 只回未讀）。
  //
  // relation='GUARDIAN' ＝「**只要跟我監護的小孩有關的**」（Human Owner 2026-08-20 回報：
  // 家長身分點開訊息中心，看得到其他小朋友的聯絡簿）。通知本來就只發給本人，
  // 所以這不是權限問題 —— 是**世界混在一起**：他同時是老師，於是老師收到的那些通知
  // 也躺在家長的收件匣裡，點下去就進到別人小孩的那一本。
  //
  // 過濾在**伺服器端**做而不是前端：通知的標題與副標裡本來就寫著其他孩子的名字
  // （讀取時 join，見 notification-summary），只在前端藏起來等於名字仍然送到了瀏覽器。
  // 這和 /me/students?relation=GUARDIAN 是同一條規則。
  async listForUser(
    actor: NotificationActor,
    unreadOnly: boolean,
    relation?: NotificationRelationScope,
  ): Promise<NotificationView[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId: actor.id, ...(unreadOnly ? { readAt: null } : {}) },
      select: NOTIFICATION_VIEW,
      orderBy: { createdAt: 'desc' },
    });
    const scoped = relation === 'GUARDIAN' ? await this.keepGuardianOnly(actor.id, rows) : rows;
    // 過濾之後才查名稱：被濾掉的那些孩子的名字連查都不必查。
    const lookups = await this.loadLookups(scoped);
    return scoped.map((row) => ({ ...row, ...summarize(row, lookups) }));
  }

  /**
   * 只留下「跟我監護的小孩有關」的通知。三種情況：
   *   帶 studentId    → 必須是我監護的那幾個
   *   帶 announcementId → 全校公告留著；班級公告只留我小孩那一班的
   *   兩者都沒有      → 留著（系統層級的通知，與特定孩子無關）
   *
   * **只縮小、永遠不放大**：沒有監護關係就只剩系統通知與全校公告，就算他是園長。
   */
  private async keepGuardianOnly(
    userId: string,
    rows: NotificationRow[],
  ): Promise<NotificationRow[]> {
    const guardianships = await this.prisma.guardianship.findMany({
      where: { userId },
      select: { student: { select: { id: true, classId: true } } },
    });
    const studentIds = new Set(guardianships.map((g) => g.student.id));
    const classIds = new Set(guardianships.map((g) => g.student.classId));

    const announcementIds = collectIds(rows, 'announcementId');
    const announcements = announcementIds.length
      ? await this.prisma.announcement.findMany({
          where: { id: { in: announcementIds } },
          select: { id: true, classId: true },
        })
      : [];
    // classId 為 null＝全校（見 schema 的 Announcement.classId 註解）。
    const announcementClass = new Map(announcements.map((a) => [a.id, a.classId]));

    return rows.filter((row) => {
      const studentId = payloadId(row.payload, 'studentId');
      if (studentId) {
        return studentIds.has(studentId);
      }
      const announcementId = payloadId(row.payload, 'announcementId');
      if (announcementId) {
        const classId = announcementClass.get(announcementId);
        // 查不到那則公告（已刪除）→ 留著，讓使用者看得到「有這麼一則」而不是靜靜消失。
        if (classId === undefined || classId === null) return true;
        return classIds.has(classId);
      }
      return true;
    });
  }

  // PATCH /notifications/:id/read — 標記已讀（idempotent;已讀不再變更 readAt）。
  async markRead(actor: NotificationActor, id: string): Promise<NotificationView> {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true, readAt: true },
    });
    if (!existing) {
      throw new NotFoundException('notification_not_found');
    }
    if (existing.userId !== actor.id) {
      throw new ForbiddenException('out_of_scope');
    }
    // 已讀 → 不覆寫時間（idempotent）。
    const row = existing.readAt
      ? await this.prisma.notification.findUniqueOrThrow({ where: { id }, select: NOTIFICATION_VIEW })
      : await this.prisma.notification.update({
          where: { id },
          data: { readAt: new Date() },
          select: NOTIFICATION_VIEW,
        });
    const lookups = await this.loadLookups([row]);
    return { ...row, ...summarize(row, lookups) };
  }

  /**
   * 這一批通知需要的名稱與標題，**一種資源一次查完**（不是每則通知各查一次）。
   * 空清單直接省掉該次查詢。
   */
  private async loadLookups(rows: NotificationRow[]): Promise<SummaryLookups> {
    const studentIds = collectIds(rows, 'studentId');
    const announcementIds = collectIds(rows, 'announcementId');
    const messageIds = collectIds(rows, 'messageId');
    const senderIds = collectIds(rows, 'senderId');

    const [students, announcements, messages, users] = await Promise.all([
      studentIds.length
        ? this.prisma.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, name: true },
          })
        : [],
      announcementIds.length
        ? this.prisma.announcement.findMany({
            where: { id: { in: announcementIds } },
            select: { id: true, title: true, classId: true },
          })
        : [],
      messageIds.length
        ? this.prisma.message.findMany({
            where: { id: { in: messageIds } },
            select: { id: true, body: true },
          })
        : [],
      senderIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, displayName: true },
          })
        : [],
    ]);

    return {
      studentNames: new Map(students.map((s) => [s.id, s.name])),
      // classId 為 null＝全校（見 schema 的 Announcement.classId 註解）。
      announcementTitles: new Map(
        announcements.map((a) => [a.id, { title: a.title, schoolWide: a.classId === null }]),
      ),
      messageBodies: new Map(messages.map((m) => [m.id, m.body])),
      userNames: new Map(users.map((u) => [u.id, u.displayName])),
    };
  }
}
