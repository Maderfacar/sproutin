import { Injectable } from '@nestjs/common';
import type { Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';

// 稽核查詢過濾條件（來自 query string;controller 已轉型）。
export interface AuditLogFilters {
  resourceType?: string;
  resourceId?: string;
  actor?: string; // actorUserId
  from?: string; // ISO datetime（含）
  to?: string; // ISO datetime（含）
  limit?: number;
  offset?: number;
}

export interface AuditLogView {
  id: string;
  actorUserId: string | null;
  // 操作者的顯示名。稽核列只存 actorUserId（一串 cuid），畫面上沒有人看得懂是誰。
  // **讀取時才join**，不寫進 AuditLog —— 稽核列本身不存 PII（docs/03），
  // 且改名之後歷史紀錄應該跟著顯示新名字，而不是留下當時的快照。
  actorName: string | null;
  // 操作當下的身分（**存在列上的快照，不是現在的身分**）。稽核要的是「他當時以什麼身分做的」，
  // 事後被拿掉權限不能讓歷史紀錄跟著變。因此這一欄不重新 join。
  actorRole: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: string;
  scopeType: string | null;
  scopeId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

export interface AuditLogPage {
  data: AuditLogView[];
  total: number;
  limit: number;
  offset: number;
}

// 從 DB 取出來的原始列（尚未補上操作者姓名）。
type AuditLogRow = Omit<AuditLogView, 'actorName'>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const AUDIT_VIEW = {
  id: true,
  actorUserId: true,
  actorRole: true,
  action: true,
  resourceType: true,
  resourceId: true,
  result: true,
  scopeType: true,
  scopeId: true,
  metadata: true,
  createdAt: true,
} as const;

// 稽核查詢（OWNER/ADMIN;授權在 controller 的 RolesGuard）。
// 只讀;分頁 + 過濾（resourceType / resourceId / actor / date range）。
@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async query(filters: AuditLogFilters): Promise<AuditLogPage> {
    const limit = clamp(filters.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = Math.max(filters.offset ?? 0, 0);

    const createdAt = buildDateRange(filters.from, filters.to);
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
      ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
      ...(filters.actor ? { actorUserId: filters.actor } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: AUDIT_VIEW,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: await this.withActorNames(rows), total, limit, offset };
  }

  // 補上操作者姓名。一次查詢涵蓋整頁（最多 100 列），不隨列數成長。
  //
  // 查不到人時回 null 而**不是**填一個看起來正常的空字串 —— 前端會退回顯示 ID，
  // 讓「這筆查不到是誰」看得出來，而不是變成一列沒有操作者的紀錄。
  private async withActorNames(rows: AuditLogRow[]): Promise<AuditLogView[]> {
    const ids = [...new Set(rows.map((r) => r.actorUserId).filter(isUserId))];
    if (ids.length === 0) {
      return rows.map((r) => ({ ...r, actorName: null }));
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true },
    });
    const nameOf = new Map(users.map((u) => [u.id, u.displayName]));
    return rows.map((r) => ({
      ...r,
      actorName: r.actorUserId ? (nameOf.get(r.actorUserId) ?? null) : null,
    }));
  }
}

function isUserId(value: string | null): value is string {
  return typeof value === 'string' && value !== '';
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

// 解析 date range;無效日期忽略（不擋查詢）。兩端皆無 → 回 undefined。
function buildDateRange(
  from?: string,
  to?: string,
): Prisma.DateTimeFilter | undefined {
  const gte = parseDate(from);
  const lte = parseDate(to);
  if (!gte && !lte) {
    return undefined;
  }
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
