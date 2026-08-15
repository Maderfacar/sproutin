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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: AUDIT_VIEW,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, limit, offset };
  }
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
