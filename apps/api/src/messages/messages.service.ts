import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type { GuardianRelation, MessageCategory, Prisma, Role } from '@sproutin/db';
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

// 發話者的顯示資訊。前端只拿得到 senderId（一串 cuid），無法在對話泡泡上標出是誰講的；
// 一個學生的對話串裡可能同時有父、母、導師、園長，長得一樣就分不出來。
// **翻成中文是前端的事**（RELATION_LABEL / ROLE_LABEL 已存在），這裡只給「事實」。
export interface MessageSenderInfo {
  senderName: string;
  senderRelation: GuardianRelation | null; // 對「這個學生」的關係；非家長為 null
  senderRole: Role | null; // 校方身分；家長為 null
}

export interface MessageView extends MessageSenderInfo {
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

// 一個人可能同時有多個校方身分（園長兼帶班）。挑「最能代表他」的那一個來顯示，
// 順序＝對家長而言最有意義的稱呼。
const STAFF_ROLE_PRIORITY: Role[] = ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER'];

// 帳號一律停用不刪除（見 User.status 的註解），所以查不到人理論上不會發生。
// 真的發生時**明講**，不要顯示空白讓人以為是系統漏字。
const UNKNOWN_SENDER: MessageSenderInfo = {
  senderName: '未知的發話者',
  senderRelation: null,
  senderRole: null,
};

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
    // 發話者資訊在交易外先查好 —— 交易進行中再對主連線發查詢會佔用兩條連線，
    // 而這筆資料與這次寫入無關，沒有理由讓它待在交易裡。
    const sender = await this.describeSender(input.studentId, actor.id);

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
      return { ...message, isRead: true, ...sender };
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
    const senders = await this.describeSenders(studentId, [...new Set(messages.map((m) => m.senderId))]);
    return messages.map((m) => ({
      ...m,
      isRead: readIds.has(m.id) || m.senderId === actor.id,
      ...(senders.get(m.senderId) ?? UNKNOWN_SENDER),
    }));
  }

  // 發話者是誰（姓名 + 對這個學生的身分）。兩次查詢涵蓋整串訊息，不隨訊息數成長。
  //
  // **同時是校方又是這個孩子的家長時，顯示家長身分**（例如老師自己的小孩也在園裡）：
  // 在這個孩子的對話串裡，他是以家人的身分在講話。
  private async describeSenders(
    studentId: string,
    senderIds: string[],
  ): Promise<Map<string, MessageSenderInfo>> {
    if (senderIds.length === 0) {
      return new Map();
    }
    const [users, guardianships] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, displayName: true, roles: { select: { role: true } } },
      }),
      this.prisma.guardianship.findMany({
        where: { studentId, userId: { in: senderIds } },
        select: { userId: true, relation: true },
      }),
    ]);
    const relationOf = new Map(guardianships.map((g) => [g.userId, g.relation]));
    return new Map(
      users.map((u) => {
        const relation = relationOf.get(u.id) ?? null;
        const held = new Set(u.roles.map((r) => r.role));
        return [
          u.id,
          {
            senderName: u.displayName,
            senderRelation: relation,
            senderRole: relation ? null : (STAFF_ROLE_PRIORITY.find((r) => held.has(r)) ?? null),
          },
        ];
      }),
    );
  }

  private async describeSender(studentId: string, senderId: string): Promise<MessageSenderInfo> {
    const senders = await this.describeSenders(studentId, [senderId]);
    return senders.get(senderId) ?? UNKNOWN_SENDER;
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
