import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeaveReview } from './LeaveReview';
import type { LeaveView } from '../../lib/types';

const state = vi.hoisted(() => ({
  roles: [{ role: 'TEACHER' }] as { role: string }[],
  classes: [{ id: 'c1', name: '小班' }] as { id: string; name: string }[],
  classPending: [] as LeaveView[],
  schoolPending: [] as LeaveView[],
  reviewed: [] as unknown[],
}));

vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '李老師', roles: state.roles } }),
}));
vi.mock('../classes/hooks', () => ({
  useSelectedClass: () => ({
    classes: state.classes,
    classId: state.classes[0]?.id,
    setClassId: () => {},
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('../../lib/queries', () => ({
  useMyStudents: () => ({ data: [{ id: 's1', name: '陳小宇', classId: 'c1' }] }),
}));
vi.mock('./hooks', () => ({
  useClassPendingLeaves: () => ({
    data: state.classPending,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  }),
  useSchoolPendingLeaves: () => ({
    data: state.schoolPending,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  }),
  useSetLeaveStatus: () => ({
    mutate: (b: unknown) => state.reviewed.push(b),
    isPending: false,
    isError: false,
    error: null,
  }),
  useCreateLeave: () => ({ mutate: () => {}, isPending: false, isError: false, error: null }),
}));

const leave = (id = 'l1'): LeaveView => ({
  id,
  studentId: 's1',
  dateFrom: '2026-08-20T00:00:00.000Z',
  dateTo: '2026-08-20T00:00:00.000Z',
  reason: '病假：發燒',
  status: 'PENDING',
  reviewedBy: null,
  reviewNote: null,
  createdBy: 'u2',
  createdAt: '2026-08-20T01:00:00.000Z',
});

describe('請假審核', () => {
  beforeEach(() => {
    state.roles = [{ role: 'TEACHER' }];
    state.classes = [{ id: 'c1', name: '小班' }];
    state.classPending = [];
    state.schoolPending = [];
    state.reviewed = [];
  });

  it('導師看的是自己班上的待審', () => {
    state.classPending = [leave()];
    render(<LeaveReview scope="class" />);
    expect(screen.getByText('陳小宇')).toBeTruthy();
    expect(screen.getByText('病假：發燒')).toBeTruthy();
  });

  it('園長看的是全校那一份', () => {
    state.roles = [{ role: 'ADMIN' }];
    state.schoolPending = [leave()];
    state.classPending = [];
    render(<LeaveReview scope="school" />);
    expect(screen.getByText('陳小宇')).toBeTruthy();
  });

  it('准假直接送出', () => {
    state.classPending = [leave()];
    render(<LeaveReview scope="class" />);
    fireEvent.click(screen.getByRole('button', { name: '准假' }));
    expect(state.reviewed).toEqual([{ leaveId: 'l1', body: { status: 'APPROVED' } }]);
  });

  // 家長收到「已駁回」卻不知道為什麼，只會再打電話問一次老師。
  it('不准一定要寫理由，沒寫不會送出', () => {
    state.classPending = [leave()];
    render(<LeaveReview scope="class" />);

    fireEvent.click(screen.getByRole('button', { name: '不准' }));
    fireEvent.click(screen.getByRole('button', { name: '確定不准，並通知家長' }));

    expect(state.reviewed).toHaveLength(0);
    expect(screen.getByText('請寫一句原因，家長才知道要怎麼辦。')).toBeTruthy();
  });

  it('寫了理由就送得出去，理由跟著一起送', () => {
    state.classPending = [leave()];
    render(<LeaveReview scope="class" />);

    fireEvent.click(screen.getByRole('button', { name: '不准' }));
    fireEvent.change(screen.getByPlaceholderText(/期末成果發表/), {
      target: { value: '這天有活動' },
    });
    fireEvent.click(screen.getByRole('button', { name: '確定不准，並通知家長' }));

    expect(state.reviewed).toEqual([
      { leaveId: 'l1', body: { status: 'REJECTED', reviewNote: '這天有活動' } },
    ]);
  });

  // 只有 OWNER 身分的園長看得到但改不動（docs/05 矩陣）。
  it('沒有審核權的園長看得到內容，但不給按了會 403 的按鈕', () => {
    state.roles = [{ role: 'OWNER' }];
    state.schoolPending = [leave()];
    render(<LeaveReview scope="school" />);
    expect(screen.queryByRole('button', { name: '准假' })).toBeNull();
    expect(screen.getByText('這筆由導師或行政人員審核，你在這裡看得到結果。')).toBeTruthy();
  });

  // 家長打電話來請假是實際會發生的事，這個能力不能在改版時掉。
  it('校方可以代家長請假，但那是次要按鈕', () => {
    render(<LeaveReview scope="class" />);
    const apply = screen.getByRole('button', { name: '代家長請假' });
    expect(apply.className).not.toContain('bg-brand-primary');
    fireEvent.click(apply);
    expect(screen.getByRole('heading', { name: '代家長請假' })).toBeTruthy();
  });

  it('沒有待審時說的是好消息，不是「無資料」', () => {
    render(<LeaveReview scope="class" />);
    expect(screen.getByText('沒有等你審核的請假')).toBeTruthy();
  });

  it('沒帶班級的老師看到的是說明，不是空白', () => {
    state.classes = [];
    render(<LeaveReview scope="class" />);
    expect(screen.getByText('你目前沒有帶班級')).toBeTruthy();
  });
});
