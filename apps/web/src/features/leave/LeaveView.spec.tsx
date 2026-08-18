import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaveView } from './LeaveView';

const state = vi.hoisted(() => ({
  roles: [{ role: 'PARENT' }] as { role: string }[],
  studentId: 's1' as string | undefined,
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/liff/leave' }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '王小明', roles: state.roles } }),
}));
vi.mock('../students/useSelectedStudent', () => ({
  useSelectedStudent: () => ({
    students: [{ id: 's1', name: '陳小宇' }],
    studentId: state.studentId,
    setStudentId: () => {},
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('./LeaveForm', () => ({ LeaveForm: () => <p>請假表單</p> }));
vi.mock('./LeaveList', () => ({ LeaveList: () => <p>請假清單</p> }));
vi.mock('./TeacherLeaveReviewPanel', () => ({ TeacherLeaveReviewPanel: () => <p>班級待審面板</p> }));
vi.mock('./SchoolLeaveOverviewPanel', () => ({ SchoolLeaveOverviewPanel: () => <p>全校待審面板</p> }));

function headings(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h2')].map((h) => h.textContent ?? '');
}

describe('請假頁的斷句', () => {
  beforeEach(() => {
    state.roles = [{ role: 'PARENT' }];
    state.studentId = 's1';
  });

  it('家長：先申請、再看紀錄，紀錄那段收斂一階', () => {
    const { container } = render(<LeaveView />);
    expect(headings(container)).toEqual(['申請請假', '請假紀錄']);
    expect(container.querySelectorAll('.border-b-2')).toHaveLength(1); // 只有「申請」是要做的事
  });

  it('還沒選到學生時不長出一段空的紀錄', () => {
    state.studentId = undefined;
    const { container } = render(<LeaveView />);
    expect(headings(container)).toEqual(['申請請假']);
    expect(screen.queryByText('請假清單')).toBeNull();
  });

  it('老師：待審排在申請前面', () => {
    state.roles = [{ role: 'TEACHER' }];
    const { container } = render(<LeaveView />);
    expect(headings(container)).toEqual(['待審核的請假', '申請請假', '請假紀錄']);
    expect(screen.getByText('班級待審面板')).toBeTruthy();
  });

  it('園長看的是全校待審那一份', () => {
    state.roles = [{ role: 'OWNER' }];
    render(<LeaveView />);
    expect(screen.getByText('全校待審面板')).toBeTruthy();
    expect(screen.getByText('全校送上來的申請都在這裡')).toBeTruthy();
  });

  // 待審是校方獨有的一段，貼身分籤是安全的；申請那段的清單混著自己的小孩，不貼。
  it('老師兼家長：只有待審那段標身分', () => {
    state.roles = [{ role: 'TEACHER' }, { role: 'PARENT' }];
    render(<LeaveView />);
    expect(screen.getAllByText(/以.*身分/)).toHaveLength(1);
    expect(screen.getByText('以老師身分')).toBeTruthy();
  });
});
