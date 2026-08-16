import type { AuthUser } from '@sproutin/shared';

// 由使用者角色推導「能看到哪些操作面板」。多角色取聯集（一人可兼家長/老師/園長）。
// 這僅決定 UI 顯示;真正授權仍在後端 Guard（Rule 5/6）——與後端各端點的 @Roles 對齊,避免顯示會 403 的面板。
export interface RoleFlags {
  isGuardian: boolean; // 家長/監護人 → 可申請請假、看自己小孩
  canReviewLeave: boolean; // ADMIN/TEACHER → 審核請假（POST /leaves/:id/status）
  canMarkAttendance: boolean; // ADMIN/TEACHER → 點名（POST/PATCH /attendance）
  canAnnounce: boolean; // OWNER/ADMIN/TEACHER → 發公告（POST /announcements）
  canAnnounceSchool: boolean; // OWNER/ADMIN → 發全校公告（scope=SCHOOL）
  canViewSchoolLeaves: boolean; // OWNER/ADMIN → 全校待審請假總覽（GET /leaves 無 classId）
  canViewAudit: boolean; // OWNER/ADMIN → 稽核查詢（GET /audit-logs）
  isStaff: boolean; // 任一校方角色（需要班級清單/班名）
}

export function roleFlags(roles: AuthUser['roles']): RoleFlags {
  const names = new Set(roles.map((r) => r.role));
  const isTeacher = names.has('TEACHER');
  const isAdmin = names.has('ADMIN');
  const isOwner = names.has('OWNER');
  const isOwnerOrAdmin = isOwner || isAdmin;
  return {
    isGuardian: names.has('PARENT') || names.has('GUARDIAN'),
    canReviewLeave: isAdmin || isTeacher,
    canMarkAttendance: isAdmin || isTeacher,
    canAnnounce: isOwner || isAdmin || isTeacher,
    canAnnounceSchool: isOwnerOrAdmin,
    canViewSchoolLeaves: isOwnerOrAdmin,
    canViewAudit: isOwnerOrAdmin,
    isStaff: isOwner || isAdmin || isTeacher || names.has('BUS_TEACHER'),
  };
}
