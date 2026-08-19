import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceView } from './AttendanceView';

const state = vi.hoisted(() => ({
  roles: [{ role: 'PARENT' }] as { role: string }[],
  pathname: '/liff/attendance',
}));

vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '王小明', roles: state.roles } }),
}));
vi.mock('../students/useSelectedStudent', () => ({
  useSelectedStudent: () => ({
    students: [{ id: 's1', name: '陳小宇' }],
    studentId: 's1',
    setStudentId: () => {},
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('./TeacherRosterPanel', () => ({ TeacherRosterPanel: () => <p>點名面板</p> }));
vi.mock('./AttendanceList', () => ({ AttendanceList: () => <p>出缺勤清單</p> }));

function headings(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h2')].map((h) => h.textContent ?? '');
}

describe('出缺勤頁的斷句', () => {
  beforeEach(() => {
    state.roles = [{ role: 'PARENT' }];
    state.pathname = '/liff/attendance';
  });

  it('家長只有查看那一段', () => {
    const { container } = render(<AttendanceView />);
    expect(headings(container)).toEqual(['出缺勤紀錄']);
    expect(screen.queryByText('點名面板')).toBeNull();
  });

  it('老師：點名排在查看前面，而且用粗線收住', () => {
    state.roles = [{ role: 'TEACHER' }];
    const { container } = render(<AttendanceView />);
    expect(headings(container)).toEqual(['今天的點名', '查看單一學生']);
    expect(container.querySelectorAll('.border-b-2')).toHaveLength(1);
  });

  // 桌面左右分欄、手機上下斷句，兩邊講的是同一件事 —— Band 在 SplitColumns 的兩欄裡面。
  it('桌面外框照樣切兩欄，兩欄各自帶著自己的斷句', () => {
    state.roles = [{ role: 'TEACHER' }];
    state.pathname = '/admin/attendance';
    const { container } = render(<AttendanceView />);
    expect(container.querySelector('[class*="grid-cols-2"]')).not.toBeNull();
    expect(headings(container)).toEqual(['今天的點名', '查看單一學生']);
  });

  // 身分籤已退役；混在一起的清單改用文案講清楚就好。
  it('老師兼家長不再看到身分籤，清單混著誰仍用文案講明', () => {
    state.roles = [{ role: 'TEACHER' }, { role: 'PARENT' }];
    render(<AttendanceView />);
    expect(screen.queryByText(/以.*身分/)).toBeNull();
    expect(screen.getByText('你帶的班級和你自己的小孩都在這個清單裡')).toBeTruthy();
  });
});
