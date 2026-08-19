import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonEditor } from './PersonEditor';
import type { UserView } from '../../lib/types';

// 這一組只測一件事，但那件事會決定會不會出人命等級的誤操作：
// **每一個「拿走某個人某樣東西」的動作，都要先在底部面板問一次，並且說清楚他會失去什麼。**
//
// 舊版是就地把按鈕展開成兩顆 —— 而「確定移除」正好長在手指剛按過「移除」的位置上，
// 連按兩下就沒了（清葉加厚 2026-08-20 的手感規範第 8 條）。

const calls = vi.hoisted(() => ({
  update: vi.fn(),
  removeGuardianship: vi.fn(),
  revokeRole: vi.fn(),
}));

const idleMutation = vi.hoisted(() => () => ({
  mutate: () => {},
  isPending: false,
  isError: false,
  error: null,
}));

const mutationWith = vi.hoisted(() => (mutate: (...args: unknown[]) => void) => () => ({
  mutate,
  isPending: false,
  isError: false,
  error: null,
}));

vi.mock('../../lib/session', () => ({
  useSession: () => ({
    user: {
      id: 'u-owner',
      displayName: '園長',
      roles: [{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }],
    },
  }),
}));

vi.mock('./hooks', () => ({
  useUpdatePerson: mutationWith(calls.update),
  useAddGuardianship: idleMutation,
  useRemoveGuardianship: mutationWith(calls.removeGuardianship),
  useAddTeacherAssignment: idleMutation,
  useRemoveTeacherAssignment: idleMutation,
  useGrantRole: idleMutation,
  useRevokeRole: mutationWith(calls.revokeRole),
  useBindingCodes: () => ({ data: [] }),
  useIssueBindingCode: idleMutation,
  useRevokeBindingCode: idleMutation,
  useUnbindLine: idleMutation,
  RELATION_LABEL: { FATHER: '父親', MOTHER: '母親', GRANDPARENT: '祖父母', GUARDIAN: '監護人' },
  peopleErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const person: UserView = {
  id: 'p1',
  displayName: '林老師',
  status: 'ACTIVE',
  hasLineLinked: true,
  roles: [
    { role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null },
    { role: 'PARENT', scopeType: 'SCHOOL', scopeId: null },
  ],
  teaching: [{ id: 't1', classId: 'c1', className: '太陽班' }],
  guardianOf: [{ id: 'g1', studentId: 's1', studentName: '陳小宇', relation: 'MOTHER', isPrimary: true }],
};

function renderEditor(): void {
  render(<PersonEditor person={person} classes={[]} students={[]} onClose={() => {}} />);
}

beforeEach(() => {
  calls.update.mockReset();
  calls.removeGuardianship.mockReset();
  calls.revokeRole.mockReset();
});

describe('人員編輯面板的破壞性動作', () => {
  it('按「停用帳號」不會直接停用，先問一次並說清楚後果', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: '停用帳號' }));

    expect(calls.update).not.toHaveBeenCalled();
    expect(screen.getByText(/停用之後他就登不進來/)).toBeTruthy();
    expect(screen.getByText(/紀錄都會完整保留/)).toBeTruthy();
  });

  it('在面板裡按下確定才真的停用', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: '停用帳號' }));
    fireEvent.click(screen.getByRole('button', { name: '確定停用這個帳號' }));

    expect(calls.update).toHaveBeenCalledTimes(1);
    expect(calls.update.mock.calls[0]![0]).toMatchObject({
      id: 'p1',
      patch: { status: 'INACTIVE' },
    });
  });

  it('解除小孩綁定要先問，而且講明他之後看不到什麼', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: '解除與 陳小宇 的綁定' }));

    expect(calls.removeGuardianship).not.toHaveBeenCalled();
    expect(screen.getByText(/看不到 陳小宇 的出缺勤、聯絡簿與請假/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '確定解除綁定' }));
    expect(calls.removeGuardianship).toHaveBeenCalledWith({ id: 'g1' });
  });

  // 不再是老師就不會留在班上 —— 那件事要在按下去之前講，不是事後才發現班級不見了。
  it('移除身分要先問，而且標明會連帶失去的關聯', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: '移除 老師 這個身分' }));

    expect(calls.revokeRole).not.toHaveBeenCalled();
    expect(screen.getByText(/會同時取消他帶的 1 個班級/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '確定移除' }));
    expect(calls.revokeRole.mock.calls[0]![0]).toMatchObject({ userId: 'p1', role: 'TEACHER' });
  });

  // 停用中的帳號再被指派身分或關聯，會拿到一個登不進來卻掛在班上的幽靈權限。
  it('停用中的帳號不給新增關聯的入口', () => {
    render(
      <PersonEditor
        person={{ ...person, status: 'INACTIVE' }}
        classes={[{ id: 'c2', name: '月亮班', studentCount: 0 }]}
        students={[]}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: '排入一個班級' })).toBeNull();
    expect(screen.getByText(/不能再指派身分、班級或綁定小孩/)).toBeTruthy();
  });
});
