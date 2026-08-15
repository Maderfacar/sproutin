import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';

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
}

const NOTIFICATION_VIEW = {
  id: true,
  type: true,
  payload: true,
  readAt: true,
  createdAt: true,
} as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /notifications?unread=true — 本人通知（預設全部;unread=true 只回未讀）。
  async listForUser(actor: NotificationActor, unreadOnly: boolean): Promise<NotificationView[]> {
    return this.prisma.notification.findMany({
      where: { userId: actor.id, ...(unreadOnly ? { readAt: null } : {}) },
      select: NOTIFICATION_VIEW,
      orderBy: { createdAt: 'desc' },
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
    if (existing.readAt) {
      return this.prisma.notification.findUniqueOrThrow({ where: { id }, select: NOTIFICATION_VIEW });
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
      select: NOTIFICATION_VIEW,
    });
  }
}
