import { describe, it, expect } from 'vitest';
import { personaFlags, roleFlags } from './roles';
import type { AuthUser } from '@sproutin/shared';

const r = (...roles: AuthUser['roles'][number]['role'][]): AuthUser['roles'] =>
  roles.map((role) => ({ role, scopeType: 'SCHOOL' as const, scopeId: null }));

describe('roleFlags', () => {
  it('家長：可申請 + 看自己小孩；不可審核/點名/稽核', () => {
    const f = roleFlags(r('PARENT'));
    expect(f.isGuardian).toBe(true);
    expect(f.canApplyLeave).toBe(true);
    expect(f.canReviewLeave).toBe(false);
    expect(f.canMarkAttendance).toBe(false);
    expect(f.canViewAudit).toBe(false);
    expect(f.canViewSchoolLeaves).toBe(false);
  });

  it('老師：可審核/點名/申請/發公告；非全校視角', () => {
    const f = roleFlags(r('TEACHER'));
    expect(f.canReviewLeave).toBe(true);
    expect(f.canMarkAttendance).toBe(true);
    expect(f.canApplyLeave).toBe(true);
    expect(f.canAnnounce).toBe(true);
    expect(f.canViewSchoolLeaves).toBe(false);
    expect(f.canViewAudit).toBe(false);
  });

  it('園長：全校視角 + 稽核；但不可審核/點名/申請（對齊後端矩陣）', () => {
    const f = roleFlags(r('OWNER'));
    expect(f.canViewAudit).toBe(true);
    expect(f.canViewSchoolLeaves).toBe(true);
    expect(f.canAnnounceSchool).toBe(true);
    expect(f.canReviewLeave).toBe(false);
    expect(f.canApplyLeave).toBe(false);
    expect(f.isGuardian).toBe(false);
  });

  it('多重身份（園長+行政+家長）取聯集', () => {
    const f = roleFlags(r('OWNER', 'ADMIN', 'PARENT'));
    expect(f.canApplyLeave).toBe(true); // 家長/行政
    expect(f.canReviewLeave).toBe(true); // 行政
    expect(f.canViewAudit).toBe(true); // 園長/行政
    expect(f.isGuardian).toBe(true); // 家長
  });

  it('隨車老師：可點名娃娃車，但不可審核請假或點名出缺勤', () => {
    const f = roleFlags(r('BUS_TEACHER'));
    expect(f.canMarkBusRide).toBe(true);
    expect(f.canReviewLeave).toBe(false);
    expect(f.canMarkAttendance).toBe(false);
    expect(f.canManageSchool).toBe(false);
  });

  it('一般老師沒有娃娃車點名面板（沒被指派車次，後端也會擋）', () => {
    expect(roleFlags(r('TEACHER')).canMarkBusRide).toBe(false);
    expect(roleFlags(r('PARENT')).canMarkBusRide).toBe(false);
    expect(roleFlags(r('OWNER')).canMarkBusRide).toBe(true);
  });

  it('無角色 → 全部 false', () => {
    const f = roleFlags([]);
    expect(f.isGuardian).toBe(false);
    expect(f.canApplyLeave).toBe(false);
    expect(f.canReviewLeave).toBe(false);
    expect(f.canViewAudit).toBe(false);
  });
});

// 多重身分：只有「校方 + 家長」的人才需要在版面上被告知這一區是哪個身分在看。
describe('hasDualIdentity', () => {
  const r = (...names: string[]) =>
    roleFlags(names.map((role) => ({ role }) as never));

  it('老師兼家長 → true', () => {
    expect(r('TEACHER', 'PARENT').hasDualIdentity).toBe(true);
  });

  it('園長兼家長 → true', () => {
    expect(r('OWNER', 'GUARDIAN').hasDualIdentity).toBe(true);
  });

  it('隨車老師兼家長 → true', () => {
    expect(r('BUS_TEACHER', 'PARENT').hasDualIdentity).toBe(true);
  });

  it('只是家長 → false（標身分對他是廢話）', () => {
    expect(r('PARENT').hasDualIdentity).toBe(false);
  });

  it('只是老師 → false', () => {
    expect(r('TEACHER').hasDualIdentity).toBe(false);
    expect(r('OWNER', 'ADMIN').hasDualIdentity).toBe(false);
  });
});

// 身分收斂（lib/roles 的 personaFlags）。這是「同一個坑第四次」之後補的：
// 前三次是資料範圍（/me/students、/classes、家長首頁的卡片），這一次是介面入口。
describe('personaFlags', () => {
  const teacherParent = roleFlags([
    { role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null },
    { role: 'PARENT', scopeType: 'SCHOOL', scopeId: null },
  ]);

  it('家長身分：校方的入口全部收起來', () => {
    const f = personaFlags(teacherParent, 'parent');
    expect(f.canAnnounce).toBe(false);
    expect(f.canReviewLeave).toBe(false);
    expect(f.canMarkAttendance).toBe(false);
    expect(f.canManageSchool).toBe(false);
    expect(f.canViewAudit).toBe(false);
    expect(f.isStaff).toBe(false);
  });

  it('家長身分：還是家長 —— 看得到自己小孩、請得了假', () => {
    const f = personaFlags(teacherParent, 'parent');
    expect(f.isGuardian).toBe(true);
    expect(f.canApplyLeave).toBe(true);
  });

  // 校方三種身分維持角色聯集。硬切會出事：同時是導師與隨車老師的人，
  // availablePersonas 只給他 teacher（bus 身分要「沒有其他校方身分」才成立），
  // 在 teacher 身分下拿掉 canMarkBusRide，他就再也點不到娃娃車點名了。
  it('老師身分：不動它，否則兼隨車老師的人會失去點名入口', () => {
    const busTeacher = roleFlags([
      { role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null },
      { role: 'BUS_TEACHER', scopeType: 'SCHOOL', scopeId: null },
    ]);
    expect(personaFlags(busTeacher, 'teacher')).toEqual(busTeacher);
    expect(personaFlags(busTeacher, 'teacher').canMarkBusRide).toBe(true);
  });

  it('園長身分：不動它', () => {
    const owner = roleFlags([{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }]);
    expect(personaFlags(owner, 'staff')).toEqual(owner);
  });

  // 完全沒有身分的帳號會落在 parent（見 defaultPersona）——
  // 那時連 isGuardian 都是 false，什麼都不該給。
  it('沒有監護關係卻落在家長身分 → 請假也不給', () => {
    const none = roleFlags([]);
    const f = personaFlags(none, 'parent');
    expect(f.isGuardian).toBe(false);
    expect(f.canApplyLeave).toBe(false);
  });
});
