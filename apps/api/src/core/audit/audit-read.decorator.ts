import { SetMetadata } from '@nestjs/common';

export const AUDIT_READ_KEY = 'audit:read';

// 敏感 READ 白名單標記（ADR-005：只記敏感操作，避免對一般 GET 產生洪流）。
// resourceId 來源二選一：param（req.params[param]）或 query（req.query[query]）。
export interface AuditReadMeta {
  resourceType: string; // 如 "Student" / "Message" / "AuditLog"
  action?: string; // 稽核 action;預設 "read"
  param?: string; // 從路由參數取 resourceId（如 :id）
  query?: string; // 從 query string 取 resourceId（如 ?studentId=）
}

// 掛在需要稽核的敏感 READ 端點;AuditReadInterceptor（全域）讀取此標記後於成功回應時 enqueue。
export const AuditRead = (meta: AuditReadMeta): MethodDecorator =>
  SetMetadata(AUDIT_READ_KEY, meta);
