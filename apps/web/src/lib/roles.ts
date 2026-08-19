import type { AuthUser } from '@sproutin/shared';
import type { Persona } from './persona';

// 由使用者角色推導「能看到哪些操作面板」。多角色取聯集（一人可兼家長/老師/園長）。
// 這僅決定 UI 顯示;真正授權仍在後端 Guard（Rule 5/6）——與後端各端點的 @Roles 對齊,避免顯示會 403 的面板。
export interface RoleFlags {
  isGuardian: boolean; // 家長/監護人 → 看自己小孩
  canApplyLeave: boolean; // PARENT/GUARDIAN/ADMIN/TEACHER → 可申請請假（POST /leaves;docs/05 矩陣）
  canReviewLeave: boolean; // ADMIN/TEACHER → 審核請假（POST /leaves/:id/status）
  canMarkAttendance: boolean; // ADMIN/TEACHER → 點名（POST/PATCH /attendance）
  canAnnounce: boolean; // OWNER/ADMIN/TEACHER → 發公告（POST /announcements）
  canAnnounceSchool: boolean; // OWNER/ADMIN → 發全校公告（scope=SCHOOL）
  canViewSchoolLeaves: boolean; // OWNER/ADMIN → 全校待審請假總覽（GET /leaves 無 classId）
  canViewAudit: boolean; // OWNER/ADMIN → 稽核查詢（GET /audit-logs）
  canManageSchool: boolean; // OWNER/ADMIN → 園所設定（GET/PATCH /school/config;docs/05 矩陣 2026-08-17 放寬 ADMIN）
  canMarkBusRide: boolean; // OWNER/ADMIN/BUS_TEACHER → 娃娃車點名（POST /bus/rides/*）
  isStaff: boolean; // 任一校方角色（需要班級清單/班名）
  // 同時是校方又是家長。用來決定版面上要不要標「以老師身分／以家長身分」——
  // 只有這種人會在同一頁上同時看到「我要做的事」與「我孩子的狀況」而分不出來;
  // 純家長或純老師看到身分籤只是廢話（Human Owner 2026-08-18 定案）。
  hasDualIdentity: boolean;
}

export function roleFlags(roles: AuthUser['roles']): RoleFlags {
  const names = new Set(roles.map((r) => r.role));
  const isTeacher = names.has('TEACHER');
  const isAdmin = names.has('ADMIN');
  const isOwner = names.has('OWNER');
  const isOwnerOrAdmin = isOwner || isAdmin;
  const isGuardian = names.has('PARENT') || names.has('GUARDIAN');
  return {
    isGuardian,
    canApplyLeave: isGuardian || isAdmin || isTeacher,
    canReviewLeave: isAdmin || isTeacher,
    canMarkAttendance: isAdmin || isTeacher,
    canAnnounce: isOwner || isAdmin || isTeacher,
    canAnnounceSchool: isOwnerOrAdmin,
    canViewSchoolLeaves: isOwnerOrAdmin,
    canViewAudit: isOwnerOrAdmin,
    canManageSchool: isOwnerOrAdmin,
    // 隨車老師只在自己被指派的路線上點得動 —— 那一層由後端判斷，這裡只決定要不要顯示面板。
    canMarkBusRide: isOwnerOrAdmin || names.has('BUS_TEACHER'),
    isStaff: isOwner || isAdmin || isTeacher || names.has('BUS_TEACHER'),
    hasDualIdentity:
      (isOwner || isAdmin || isTeacher || names.has('BUS_TEACHER')) && isGuardian,
  };
}

// 目前這個**身分**要不要看到某一塊。與上面的 roleFlags 是兩件事：
//
//   roleFlags        有沒有權限。對應後端的 Guard，用在「進不進得來這一頁」。
//   personaFlags     這個身分現在要不要看到。用在共用元件裡「畫不畫這一塊」。
//
// 為什麼需要它：`/liff/announcement`、`/liff/student/[id]`、聯絡簿這些頁面是**兩種身分共用**的，
// 而 roleFlags 取的是角色聯集。於是老師兼家長切到家長身分，公告頁上仍然有一顆「發一則公告」；
// 園長兼家長的學生頁上仍然有娃娃車設定。點下去後端會放行（他確實是老師），
// 但**入口出現在家長的世界裡，就等於這個殼沒有真的把兩個世界分開**。
//
// 這是同一個坑的第四次（前三次：GET /me/students、GET /classes、家長首頁的稽核卡）。
// 前三次是資料範圍，這一次是介面入口 —— 所以修法也一樣：收斂成一個地方決定。
//
// **只縮小校方那一半，而且只在家長身分。** 校方的三種身分（staff / teacher / bus）維持角色聯集：
// 那三個殼本來就都在校方的世界裡，而且硬切會出事 —— 例如同時是導師與隨車老師的人，
// `availablePersonas` 只會給他 teacher（bus 身分要「沒有其他校方身分」才成立），
// 在 teacher 身分下拿掉 canMarkBusRide，他就再也點不到娃娃車點名了。
export function personaFlags(flags: RoleFlags, persona: Persona): RoleFlags {
  if (persona !== 'parent') {
    return flags;
  }
  return {
    isGuardian: flags.isGuardian,
    // 家長替自己的小孩請假。校方的「代家長請假」不屬於這個身分。
    canApplyLeave: flags.isGuardian,
    canReviewLeave: false,
    canMarkAttendance: false,
    canAnnounce: false,
    canAnnounceSchool: false,
    canViewSchoolLeaves: false,
    canViewAudit: false,
    canManageSchool: false,
    canMarkBusRide: false,
    isStaff: false,
    // 在家長身分裡就只有家長身分，沒有「雙重」可言。
    hasDualIdentity: false,
  };
}
