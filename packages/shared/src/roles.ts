// 角色與 scope 型別 (§18, docs/05-rbac-matrix.md)
// 與 Prisma enum 對齊；shared 供前端使用（前端僅用於顯示，不做授權）。

export const ROLES = ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN'] as const;
export type Role = (typeof ROLES)[number];

export const SCOPE_TYPES = ['SCHOOL', 'CLASS'] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export interface AuthUser {
  id: string;
  displayName: string;
  roles: { role: Role; scopeType: ScopeType; scopeId: string | null }[];
}
