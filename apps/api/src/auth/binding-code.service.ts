import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import type { AuthUser } from '@sproutin/shared';
import type { BindingCode } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';
import { RichMenuLinkService } from '../rich-menu/rich-menu-link.service';

// LINE 帳號綁定碼（Phase 9 階段3）。
//
// 為什麼需要：園所後台建立的帳號（「張媽媽，張小明的母親」）與 LINE 登入取得的匿名
// userId（`U1a2b3c…`）之間沒有任何自動對應的線索。綁定碼是園所簽發、由本人輸入一次的
// 憑證，把兩者接起來；綁的是「人」不是「小孩」，所以一次綁定，其所有小孩與角色一起生效。
//
// 為什麼是 8 碼而不是 6 碼：6 位數字只有 100 萬種組合，在沒有 rate limiting 的情況下
// 可被暴力嘗試（rate limiting 目前列為未上線的 technical debt）。改用排除易混淆字元的
// 32 字母表 × 8 碼 ≈ 1.1×10^12 組合，單靠猜測不可行，且分成兩組四碼後仍好念好抄。
// 字母表刻意排除 0/O、1/I/L 等，避免家長把紙上的字看錯而反覆失敗。
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;
const GROUP_SIZE = 4;
const DEFAULT_TTL_DAYS = 30;
const MS_PER_DAY = 86_400_000;
const MAX_GENERATE_ATTEMPTS = 5;

type BindingCodeRow = Pick<
  BindingCode,
  'id' | 'code' | 'userId' | 'expiresAt' | 'usedAt' | 'revokedAt' | 'createdAt'
>;

export interface BindingActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface BindingCodeView {
  id: string;
  code: string; // 顯示為 XXXX-XXXX
  userId: string;
  userDisplayName: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

// 正規化使用者輸入：轉大寫、去掉空白與分隔符（家長常照著紙上的 XXXX-XXXX 連字號一起打）。
// **刻意不做「看錯字元」的自動修正**：字母表已排除 0/O/1/I/L，這些字元根本不會出現在碼裡，
// 使用者若打出來代表是別的字看錯，沒有安全的猜法；自動改字只會把錯誤變得更難解釋。
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '');
}

// 顯示用：8 碼切成兩組四碼，好念、好抄、好核對。
export function formatCode(code: string): string {
  return `${code.slice(0, GROUP_SIZE)}-${code.slice(GROUP_SIZE)}`;
}

function randomCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

@Injectable()
export class BindingCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly richMenuLink: RichMenuLinkService,
  ) {}

  // GET /binding-codes?userId= — 未使用且未作廢的碼（供後台顯示與列印）。
  async list(userId?: string): Promise<BindingCodeView[]> {
    const rows = await this.prisma.bindingCode.findMany({
      where: {
        ...(userId ? { userId } : {}),
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toView(r, r.user.displayName));
  }

  // POST /binding-codes — 為某個帳號簽發一組新碼。
  // 舊的未使用碼會一併作廢：園所重發通常是因為前一張條子不見了或發錯人，
  // 留著舊碼只會擴大外流風險。
  async issue(actor: BindingActor, userId: string, ttlDays = DEFAULT_TTL_DAYS): Promise<BindingCodeView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, status: true, lineIdentity: { select: { id: true } } },
    });
    if (!user) throw new NotFoundException('user_not_found');
    if (user.status === 'INACTIVE') throw new BadRequestException('user_inactive');
    if (user.lineIdentity) throw new BadRequestException('user_already_bound');

    const code = await this.generateUniqueCode();
    const expiresAt = new Date(Date.now() + ttlDays * MS_PER_DAY);

    return this.prisma.$transaction(async (tx) => {
      await tx.bindingCode.updateMany({
        where: { userId, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      const row = await tx.bindingCode.create({
        data: { code, userId, expiresAt, createdBy: actor.id },
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'binding_code.issue',
        resourceType: 'BindingCode',
        resourceId: row.id,
        result: 'SUCCESS',
        // 稽核不存碼本身（等同憑證明文），只記發給誰與到期日。
        metadata: { targetUserId: userId, expiresAt: expiresAt.toISOString() },
      });

      return this.toView(row, user.displayName);
    });
  }

  // DELETE /binding-codes/:id — 作廢（保留紀錄供稽核，不刪除）。
  async revoke(actor: BindingActor, id: string): Promise<void> {
    const row = await this.prisma.bindingCode.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!row) throw new NotFoundException('binding_code_not_found');

    await this.prisma.$transaction(async (tx) => {
      await tx.bindingCode.update({ where: { id }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'binding_code.revoke',
        resourceType: 'BindingCode',
        resourceId: id,
        result: 'SUCCESS',
        metadata: { targetUserId: row.userId },
      });
    });
  }

  // 綁定本體：驗證碼 → 建立 LineIdentity → 標記碼已使用。全程同一交易，
  // 避免「碼被標記用掉但綁定沒成功」這種讓人卡死在門外的半套狀態。
  // 回傳綁定到的 userId，交由 AuthService 簽發 JWT。
  async redeem(rawCode: string, lineUserId: string): Promise<string> {
    const code = normalizeCode(rawCode);
    if (code.length !== CODE_LENGTH) throw new BadRequestException('binding_code_invalid');

    const row = await this.prisma.bindingCode.findUnique({
      where: { code },
      include: { user: { select: { id: true, status: true, lineIdentity: { select: { id: true } } } } },
    });

    // 查無、已用、已作廢、已過期一律回同一個錯誤碼：對外不區分「碼不存在」與「碼已失效」，
    // 否則等於提供一個可探測有效碼的介面。
    if (!row || row.usedAt || row.revokedAt || row.expiresAt <= new Date()) {
      throw new BadRequestException('binding_code_invalid');
    }
    if (row.user.status === 'INACTIVE') throw new BadRequestException('user_inactive');
    if (row.user.lineIdentity) throw new BadRequestException('user_already_bound');

    // 一個 LINE 帳號只能對應一個人。已綁過就不能再拿別人的碼來綁。
    const existing = await this.prisma.lineIdentity.findUnique({ where: { lineUserId } });
    if (existing) throw new BadRequestException('line_already_bound');

    const userId = await this.prisma.$transaction(async (tx) => {
      // 條件式更新＝樂觀鎖：兩個人同時送同一組碼時，只有一個會更新到列。
      const claimed = await tx.bindingCode.updateMany({
        where: { id: row.id, usedAt: null, revokedAt: null },
        data: { usedAt: new Date(), usedByLineUserId: lineUserId },
      });
      if (claimed.count === 0) throw new BadRequestException('binding_code_invalid');

      await tx.lineIdentity.create({ data: { lineUserId, userId: row.userId } });

      await this.audit.record(tx, {
        actorUserId: row.userId,
        actorRole: null,
        action: 'binding_code.redeem',
        resourceType: 'User',
        resourceId: row.userId,
        result: 'SUCCESS',
        // 不記 lineUserId（屬個資識別碼）與碼本身，只記綁定這件事發生了。
        metadata: { bindingCodeId: row.id },
      });

      return row.userId;
    });

    // 綁定成功 → 立刻把他的 LINE 選單換成對應身分那一份（綁定前看到的是「還沒綁定」那份）。
    // 這一步失敗不影響綁定（service 內部自行吞掉錯誤），沒換到的話園所下次套用會補上。
    await this.richMenuLink.linkAfterBinding(userId, lineUserId);

    return userId;
  }

  // 解除綁定（DELETE /users/:id/line）：換手機、綁錯人、家長換 LINE 帳號時的救援出口。
  // 解綁後該帳號回到「未綁定」，園所可重新發碼。
  async unbind(actor: BindingActor, userId: string): Promise<void> {
    const identity = await this.prisma.lineIdentity.findUnique({ where: { userId } });
    if (!identity) throw new NotFoundException('line_identity_not_found');

    await this.prisma.$transaction(async (tx) => {
      await tx.lineIdentity.delete({ where: { userId } });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'user.line_unbind',
        resourceType: 'User',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { targetUserId: userId },
      });
    });
  }

  // 碰撞機率極低，但 code 有 unique 約束，重試幾次比讓請求失敗好。
  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < MAX_GENERATE_ATTEMPTS; i += 1) {
      const candidate = randomCode();
      const taken = await this.prisma.bindingCode.findUnique({
        where: { code: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    throw new BadRequestException('binding_code_generation_failed');
  }

  private toView(row: BindingCodeRow, userDisplayName: string): BindingCodeView {
    return {
      id: row.id,
      code: formatCode(row.code),
      userId: row.userId,
      userDisplayName,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
    };
  }

  private actorRole(actor: BindingActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
