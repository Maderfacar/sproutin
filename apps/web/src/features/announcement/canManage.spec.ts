import { describe, expect, it } from 'vitest';
import { canManageAnnouncement } from './canManage';
import { personaFlags, roleFlags } from '../../lib/roles';
import type { AnnouncementView } from '../../lib/types';
import type { AuthUser } from '@sproutin/shared';

// 「誰能改／刪一則已發出的公告」。用真的 roleFlags + personaFlags 推，不是自己捏旗標 ——
// 這條規則最容易壞在身分切換那一刀上，捏出來的旗標測不到那件事。

const role = (r: AuthUser['roles'][number]['role']): AuthUser['roles'][number] => ({
  role: r,
  scopeType: 'SCHOOL',
  scopeId: null,
});

const ann = (createdBy: string): AnnouncementView => ({
  id: 'ann-1',
  schoolId: 'school-1',
  classId: 'class-sun',
  scope: 'CLASS',
  title: '向日葵班本週活動',
  body: '本週五戶外教學。',
  createdBy,
  createdAt: '2026-08-19T00:00:00.000Z',
});

describe('canManageAnnouncement', () => {
  it('園長 → 別人發的也動得了', () => {
    const flags = personaFlags(roleFlags([role('OWNER')]), 'staff');
    expect(canManageAnnouncement(flags, 'u-owner', ann('u-teacher'))).toBe(true);
  });

  it('行政 → 別人發的也動得了', () => {
    const flags = personaFlags(roleFlags([role('ADMIN')]), 'staff');
    expect(canManageAnnouncement(flags, 'u-admin', ann('u-teacher'))).toBe(true);
  });

  it('老師 → 只動得了自己發的', () => {
    const flags = personaFlags(roleFlags([role('TEACHER')]), 'teacher');
    expect(canManageAnnouncement(flags, 'u-teacher', ann('u-teacher'))).toBe(true);
    expect(canManageAnnouncement(flags, 'u-teacher', ann('u-other'))).toBe(false);
  });

  it('家長 → 一律不給（連自己發的也不行，那是另一個身分做的事）', () => {
    const flags = personaFlags(roleFlags([role('PARENT')]), 'parent');
    expect(canManageAnnouncement(flags, 'u-parent', ann('u-parent'))).toBe(false);
  });

  // 這一條是重點：同一個人、同一則公告，切了身分之後答案就不一樣。
  it('園長兼導師切到老師身分 → 只動得了自己發的', () => {
    const roles = [role('OWNER'), role('TEACHER')];
    const asStaff = personaFlags(roleFlags(roles), 'staff');
    const asTeacher = personaFlags(roleFlags(roles), 'teacher');

    expect(canManageAnnouncement(asStaff, 'u-boss', ann('u-someone'))).toBe(true);
    expect(canManageAnnouncement(asTeacher, 'u-boss', ann('u-someone'))).toBe(false);
    expect(canManageAnnouncement(asTeacher, 'u-boss', ann('u-boss'))).toBe(true);
  });

  it('園長切到家長身分 → 公告頁上不該有任何管理入口', () => {
    const roles = [role('OWNER'), role('PARENT')];
    const asParent = personaFlags(roleFlags(roles), 'parent');
    expect(canManageAnnouncement(asParent, 'u-boss', ann('u-boss'))).toBe(false);
  });
});
