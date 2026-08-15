import type { AuditEntry } from './audit.service';

// 稽核用「請求形狀」最小型別（express Request 的子集;避免耦合具體 framework 型別）。
export interface AuditRequestLike {
  method?: string;
  url?: string;
  originalUrl?: string;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  user?: { id: string; roles: { role: string }[] };
}

// AuditLog.actorRole 為單一字串;多角色以逗號串接保留資訊（對齊各 domain service 的 actorRole 作法）。
export function actorRoleOf(user?: { roles: { role: string }[] }): string | null {
  if (!user || user.roles.length === 0) {
    return null;
  }
  return user.roles.map((r) => r.role).join(',');
}

// 由請求路徑推導 resourceType（取第一段路徑）。例：/students/abc?x=1 → "students"。
export function resourceTypeFromPath(path: string): string {
  const beforeQuery = path.split('?')[0] ?? '';
  const first = beforeQuery.split('/').filter(Boolean)[0];
  return first ?? 'unknown';
}

function pathOf(req: AuditRequestLike): string {
  return req.originalUrl ?? req.url ?? '';
}

// 建立一筆 DENIED 稽核（guards 擋下時用;actor 取自已通過 JwtAuthGuard 的 req.user）。
export function buildDeniedAuditEntry(req: AuditRequestLike, reason: string): AuditEntry {
  const path = pathOf(req);
  return {
    actorUserId: req.user?.id ?? null,
    actorRole: actorRoleOf(req.user),
    action: 'access.denied',
    resourceType: resourceTypeFromPath(path),
    resourceId: req.params?.id ?? null,
    result: 'DENIED',
    metadata: { reason, method: req.method ?? null, path },
  };
}

// 建立一筆 FAILURE 稽核（伺服器端失敗;ADR-005 Case C「曾嘗試且失敗」）。
export function buildFailureAuditEntry(
  req: AuditRequestLike,
  status: number,
  message: string,
): AuditEntry {
  const path = pathOf(req);
  return {
    actorUserId: req.user?.id ?? null,
    actorRole: actorRoleOf(req.user),
    action: 'operation.failure',
    resourceType: resourceTypeFromPath(path),
    resourceId: req.params?.id ?? null,
    result: 'FAILURE',
    metadata: { method: req.method ?? null, path, status, error: message },
  };
}
