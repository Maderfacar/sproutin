'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import type { AuditLogFilters, AuditLogPage } from '../../lib/types';

function buildQuery(filters: AuditLogFilters): string {
  const qs = new URLSearchParams();
  if (filters.resourceType) qs.set('resourceType', filters.resourceType);
  if (filters.actor) qs.set('actor', filters.actor);
  if (filters.from) qs.set('from', filters.from);
  if (filters.to) qs.set('to', filters.to);
  qs.set('limit', String(filters.limit ?? 50));
  qs.set('offset', String(filters.offset ?? 0));
  return qs.toString();
}

// 稽核查詢（OWNER/ADMIN;信封回應 {data, meta}）。授權走 cookie。換頁保留前一頁避免閃爍。
export function useAuditLogs(filters: AuditLogFilters): UseQueryResult<AuditLogPage> {
  return useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => apiGet<AuditLogPage>(`/api/audit-logs?${buildQuery(filters)}`),
    placeholderData: keepPreviousData,
  });
}
