import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type {
  GuardianRelation,
  MessageCategory,
  MessageSenderAs,
  Prisma,
  Role,
} from '@sproutin/db';
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
  /**
   * 發話當下戴的是哪頂帽子（前端的身分：parent → GUARDIAN，其餘 → STAFF）。
   *
   * **不信任前端**：下面會驗證他真的持有所宣稱的身分，宣稱不成立就退回真實的那一個
   *（而不是回 400）—— 這只是顯示用的標籤，不該讓一個標籤把訊息擋下來。
   * 沒帶就依實際關係推導，與這一欄上線前的行為一致。
   */
  senderAs?: MessageSenderAs;
}

// 發話者的顯示資訊。前端只拿得到 senderId（一串 cuid），無法在對話泡泡上標出是誰講的；
// 一個學生的對話串裡可能同時有父、母、導師、園長，長得一樣就分不出來。
// **翻成中文是前端的事**（RELATION_LABEL / ROLE_LABEL 已存在），這裡只給「事實」。
export interface MessageSenderInfo {
  senderName: string;
  senderRelation: GuardianRelation | null; // 對「這個學生」的關係；以校方身分發話時為 null
  senderRole: Role | null; // 校方身分；以家長身分發話時為 null
}

// 這個人**兩種身分都查出來**的樣子。哪一個要顯示，由那一句話的 senderAs 決定
// —— 同一個人在同一串裡可能兩種身分都講過。
interface SenderIdentities {
  senderName: string;
  relation: GuardianRelation | null;
  role: Role | null;
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
  senderAs: true,
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
    // 前端宣稱的身分要先對照事實。宣稱不成立就退回他真正有的那一個 ——
    // 這是顯示用的標籤，不是權限，不該因為標籤對不上就把訊息擋下來。
    const senderAs = await this.resolveSenderAs(input.studentId, actor, input.senderAs);
    // 發話者資訊在交易外先查好 —— 交易進行中再對主連線發查詢會佔用兩條連線，
    // 而這筆資料與這次寫入無關，沒有理由讓它待在交易裡。
    const sender = await this.describeSender(input.studentId, actor.id, senderAs);

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          studentId: input.studentId,
          classId: student.classId,
          senderId: actor.id,
          senderAs,
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
    // 身分是**逐筆**決定的：同一個人在同一串裡可能兩種身分都講過。
    return messages.map((m) => ({
      ...m,
      isRead: readIds.has(m.id) || m.senderId === actor.id,
      ...this.describeAs(senders.get(m.senderId), m.senderAs),
    }));
  }

  /**
   * 前端宣稱的身分 vs 事實。**只縮小不放大**：
   *   宣稱 GUARDIAN 但不是這個孩子的監護人 → 退回 STAFF
   *   宣稱 STAFF   但沒有任何校方角色       → 退回 GUARDIAN
   *   沒宣稱                                → 依實際關係推導（是家長就 GUARDIAN）
   *
   * 退回而不是丟 400：這是顯示用的標籤，不是權限（能不能發言由 canAccessStudent 判斷）。
   * 讓一個標籤把訊息擋下來，對正在打字的人是莫名其妙的失敗。
   */
  private async resolveSenderAs(
    studentId: string,
    actor: MessageActor,
    claimed: MessageSenderAs | undefined,
  ): Promise<MessageSenderAs> {
    const guardianship = await this.prisma.guardianship.findFirst({
      where: { studentId, userId: actor.id },
      select: { id: true },
    });
    const isGuardian = guardianship !== null;
    const isStaff = actor.roles.some((r) => STAFF_ROLE_PRIORITY.includes(r.role));

    if (claimed === 'GUARDIAN') {
      return isGuardian ? 'GUARDIAN' : 'STAFF';
    }
    if (claimed === 'STAFF') {
      return isStaff ? 'STAFF' : 'GUARDIAN';
    }
    return isGuardian ? 'GUARDIAN' : 'STAFF';
  }

  // 發話者是誰（姓名 + 那一句話當下的身分）。兩次查詢涵蓋整串訊息，不隨訊息數成長。
  //
  // **身分以那一筆訊息記下的 senderAs 為準**（Human Owner 2026-08-20 回報：
  // 同時是班導與某位學生的家長時，兩種身分講的話長得一模一樣）。
  //
  // `senderAs` 為 null ＝這一欄上線前的舊訊息 → 退回原本的推導規則：
  // **同時是校方又是這個孩子的家長時顯示家長身分**（在這個孩子的對話串裡，
  // 他多半是以家人的身分在講話）。不回填舊資料 —— 我們並不知道當時他戴的是哪一頂。
  private async describeSenders(
    studentId: string,
    senderIds: string[],
  ): Promise<Map<string, SenderIdentities>> {
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
    const roleOf = new Map(
      users.map((u) => {
        const held = new Set(u.roles.map((r) => r.role));
        return [u.id, STAFF_ROLE_PRIORITY.find((r) => held.has(r)) ?? null];
      }),
    );
    return new Map(
      users.map((u) => [
        u.id,
        {
          senderName: u.displayName,
          relation: relationOf.get(u.id) ?? null,
          role: roleOf.get(u.id) ?? null,
        },
      ]),
    );
  }

  /** 把「這個人的兩種身分」與「那一句話當下的身分」組成要顯示的那一個。 */
  private describeAs(
    who: SenderIdentities | undefined,
    senderAs: MessageSenderAs | null,
  ): MessageSenderInfo {
    if (!who) {
      return UNKNOWN_SENDER;
    }
    // 舊訊息（senderAs 為 null）沿用原規則：是這個孩子的家長就顯示家長。
    const as: MessageSenderAs = senderAs ?? (who.relation ? 'GUARDIAN' : 'STAFF');
    if (as === 'GUARDIAN' && who.relation) {
      return { senderName: who.senderName, senderRelation: who.relation, senderRole: null };
    }
    return { senderName: who.senderName, senderRelation: null, senderRole: who.role };
  }

  private async describeSender(
    studentId: string,
    senderId: string,
    senderAs: MessageSenderAs | null,
  ): Promise<MessageSenderInfo> {
    const senders = await this.describeSenders(studentId, [senderId]);
    return this.describeAs(senders.get(senderId), senderAs);
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
