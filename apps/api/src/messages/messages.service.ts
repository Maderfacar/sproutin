import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type { MessageCategory, Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { ScopeResolver } from '../auth/scope-resolver.service';
import { AuditService } from '../core/audit/audit.service';

// 訊息（Student-centered，docs/02 §5 / docs/03）。雙向：校方與家長皆可針對某個學生發訊、讀取。
//   - 授權以 `canAccessStudent`（老師自班 / 家長自己小孩 / OWNER·ADMIN 全校）—— 雙向皆走同一判斷。
//   - 發訊於同一 $transaction 寫 Message + OutboxEvent(MessageSent) + AuditLog;通知由 Worker 產生（排除發訊者）。
export interface MessageActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface SendMessageInput {
  studentId: string;
  category?: MessageCategory;
  body: string;
}

export interface MessageView {
  id: string;
  studentId: string;
  classId: string;
  senderId: string;
  category: MessageCategory;
  body: string;
  createdAt: Date;
  isRead: boolean; // 目前使用者是否已讀（由 MessageRead 推導）
}

const MESSAGE_SELECT = {
  id: true,
  studentId: true,
  classId: true,
  senderId: true,
  category: true,
  body: true,
  createdAt: true,
} as const;

const EVENT = { MessageSent: 'MessageSent' } as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeResolver,
    private readonly audit: AuditService,
  ) {}

  // POST /messages — 針對某學生發訊。classId 由 student 推導（不信任前端）。
  async send(actor: MessageActor, input: SendMessageInput): Promise<MessageView> {
    const allowed = await this.scope.canAccessStudent(actor.id, actor.roles, input.studentId);
    if (!allowed) {
      throw new ForbiddenException('out_of_scope');
    }
    const student = await this.prisma.student.findUnique({
      where: { id: input.studentId },
      select: { classId: true },
    });
    if (!student) {
      throw new NotFoundException('student_not_found');
    }
    const category: MessageCategory = input.category ?? 'GENERAL';

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          studentId: input.studentId,
          classId: student.classId,
          senderId: actor.id,
          category,
          body: input.body,
        },
        select: MESSAGE_SELECT,
      });

      await tx.outboxEvent.create({
        data: {
          eventType: EVENT.MessageSent,
          payload: {
            messageId: message.id,
            studentId: message.studentId,
            classId: message.classId,
            senderId: message.senderId,
          } as Prisma.InputJsonValue,
        },
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'message.send',
        resourceType: 'Message',
        resourceId: message.id,
        result: 'SUCCESS',
        metadata: { studentId: message.studentId, category },
      });

      // 發訊者本人視為已讀。
      return { ...message, isRead: true };
    });
  }

  // GET /messages?studentId= — 該學生訊息（scope 過濾）+ 目前使用者已讀狀態。
  async listForStudent(actor: MessageActor, studentId: string): Promise<MessageView[]> {
    const allowed = await this.scope.canAccessStudent(actor.id, actor.roles, studentId);
    if (!allowed) {
      throw new ForbiddenException('out_of_scope');
    }
    const messages = await this.prisma.message.findMany({
      where: { studentId },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    if (messages.length === 0) {
      return [];
    }
    const reads = await this.prisma.messageRead.findMany({
      where: { userId: actor.id, messageId: { in: messages.map((m) => m.id) } },
      select: { messageId: true },
    });
    const readIds = new Set(reads.map((r) => r.messageId));
    return messages.map((m) => ({ ...m, isRead: readIds.has(m.id) || m.senderId === actor.id }));
  }

  // PATCH /messages/:id/read — 標記已讀（MessageRead upsert;idempotent）。
  async markRead(actor: MessageActor, messageId: string): Promise<{ ok: true }> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, studentId: true },
    });
    if (!message) {
      throw new NotFoundException('message_not_found');
    }
    const allowed = await this.scope.canAccessStudent(actor.id, actor.roles, message.studentId);
    if (!allowed) {
      throw new ForbiddenException('out_of_scope');
    }
    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId: actor.id } },
      update: {},
      create: { messageId, userId: actor.id },
    });
    return { ok: true };
  }

  private actorRole(actor: MessageActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
