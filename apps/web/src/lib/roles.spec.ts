import { describe, it, expect } from 'vitest';
import { roleFlags } from './roles';
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
