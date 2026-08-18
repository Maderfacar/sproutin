import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { collectIds, summarize, type SummaryLookups } from './notification-summary';

// Notification 讀取端（Derived;寫入端由 Step 3 事件 handler 產生）。
// 授權：使用者只能讀/改**自己的**通知（filter userId=actor.id）—— 不需 ScopeResolver。
export interface NotificationActor {
  id: string;
}

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

  // GET /notifications?unread=true — 本人通知（預設全部;unread=true 只回未讀）。
  async listForUser(actor: NotificationActor, unreadOnly: boolean): Promise<NotificationView[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId: actor.id, ...(unreadOnly ? { readAt: null } : {}) },
      select: NOTIFICATION_VIEW,
      orderBy: { createdAt: 'desc' },
    });
    const lookups = await this.loadLookups(rows);
    return rows.map((row) => ({ ...row, ...summarize(row, lookups) }));
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
