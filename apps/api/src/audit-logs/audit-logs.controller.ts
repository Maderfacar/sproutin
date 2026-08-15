import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditRead } from '../core/audit/audit-read.decorator';
import { AuditLogsService, AuditLogView } from './audit-logs.service';

interface AuditLogListResponse {
  data: AuditLogView[];
  meta: { total: number; limit: number; offset: number };
}

// 稽核查詢端點（Phase 7 Step 6）。授權：JwtAuthGuard → RolesGuard（OWNER/ADMIN）。
// 查詢稽核本身也是敏感操作 → @AuditRead 記一筆 audit.read（out-of-band，全域攔截器處理）。
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  // GET /audit-logs?resourceType=&resourceId=&actor=&from=&to=&limit=&offset=
  @Get()
  @Roles('OWNER', 'ADMIN')
  @AuditRead({ resourceType: 'AuditLog', action: 'audit.read' })
  async list(
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('actor') actor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<AuditLogListResponse> {
    const page = await this.auditLogs.query({
      resourceType,
      resourceId,
      actor,
      from,
      to,
      limit: toInt(limit),
      offset: toInt(offset),
    });
    return { data: page.data, meta: { total: page.total, limit: page.limit, offset: page.offset } };
  }
}

function toInt(value?: string): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}
