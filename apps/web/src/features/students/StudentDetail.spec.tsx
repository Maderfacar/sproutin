import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentDetail } from './StudentDetail';
import type { AttendanceView, LeaveView, StudentDetailView } from '../../lib/types';

const state = vi.hoisted(() => ({
  roles: [{ role: 'TEACHER' }] as { role: string }[],
  guardians: [] as { userId: string; displayName: string; relation: string; isPrimary: boolean }[],
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/liff/student/s1' }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '王小明', roles: state.roles } }),
}));
vi.mock('./adminHooks', () => ({
  STUDENT_STATUS_LABEL: { ACTIVE: '在學', INACTIVE: '已停用' },
  useStudentDetail: () => ({
    data: {
      id: 's1',
      name: '陳小宇',
      classId: 'c1',
      className: '小班',
      status: 'ACTIVE',
      guardians: state.guardians,
    } as StudentDetailView,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));
vi.mock('../attendance/hooks', () => ({ useAttendance: () => ({ data: [] as AttendanceView[] }) }));
vi.mock('../leave/hooks', () => ({ useLeaves: () => ({ data: [] as LeaveView[] }) }));
vi.mock('../bus/StudentBusSection', () => ({ StudentBusSection: () => <p>娃娃車設定區</p> }));

function headings(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h2')].map((h) => h.textContent ?? '');
}

describe('學生整合視圖的斷句', () => {
  beforeEach(() => {
    state.roles = [{ role: 'TEACHER' }];
    state.guardians = [];
  });

  it('孩子的名字是頁面標題本身，不是一個區塊', () => {
    const { container } = render(<StudentDetail studentId="s1" />);
    expect(screen.getByRole('heading', { level: 1, name: '陳小宇' })).toBeTruthy();
    expect(headings(container)).not.toContain('陳小宇');
  });

  it('老師看到三段翻閱，沒有娃娃車設定（他改不動）', () => {
    const { container } = render(<StudentDetail studentId="s1" />);
    expect(headings(container)).toEqual(['本月出缺勤', '家長 / 監護人', '最近請假']);
    expect(screen.queryByText('娃娃車設定區')).toBeNull();
  });

  // 唯一「動得了東西」的一段用粗線收住，其餘翻閱的用細線 —— 讀的與改的一眼分得開。
  it('園長多一段娃娃車，而且只有那一段是粗線', () => {
    state.roles = [{ role: 'OWNER' }];
    const { container } = render(<StudentDetail studentId="s1" />);
    expect(headings(container)).toEqual(['本月出缺勤', '家長 / 監護人', '娃娃車', '最近請假']);
    expect(container.querySelectorAll('.border-b-2')).toHaveLength(1);
    expect(screen.getByText('娃娃車設定區')).toBeTruthy();
  });

  it('沒綁家長時照樣講得出後果', () => {
    render(<StudentDetail studentId="s1" />);
    expect(screen.getByText(/目前收不到任何通知/)).toBeTruthy();
  });

  it('兼家長的園長不再看到身分籤', () => {
    state.roles = [{ role: 'OWNER' }, { role: 'PARENT' }];
    render(<StudentDetail studentId="s1" />);
    expect(screen.queryByText(/以.*身分/)).toBeNull();
  });
});
