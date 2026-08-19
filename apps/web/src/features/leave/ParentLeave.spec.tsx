import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParentLeave } from './ParentLeave';
import type { LeaveView } from '../../lib/types';

const state = vi.hoisted(() => ({
  students: [{ id: 's1', name: '陳小宇' }] as { id: string; name: string }[],
  leaves: [] as unknown[],
  isLoading: false,
  isError: false,
  created: [] as unknown[],
}));

vi.mock('../students/useSelectedStudent', () => ({
  useSelectedStudent: () => ({
    students: state.students,
    studentId: state.students[0]?.id,
    setStudentId: () => {},
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('./hooks', () => ({
  useLeaves: () => ({
    data: state.isLoading ? undefined : state.leaves,
    isLoading: state.isLoading,
    isError: state.isError,
    error: new Error('讀不到'),
    refetch: () => {},
  }),
  useCancelLeave: () => ({ mutate: () => {}, isPending: false, isError: false, error: null }),
  useCreateLeave: () => ({
    mutate: (body: unknown) => state.created.push(body),
    isPending: false,
    isError: false,
    error: null,
  }),
  isOptimisticLeave: (l: LeaveView) => l.id.startsWith('optimistic:'),
}));

const leave = (over: Partial<LeaveView> = {}): LeaveView => ({
  id: 'l1',
  studentId: 's1',
  dateFrom: '2026-08-20T00:00:00.000Z',
  dateTo: '2026-08-20T00:00:00.000Z',
  reason: '病假：發燒',
  status: 'PENDING',
  reviewedBy: null,
  reviewNote: null,
  createdBy: 'u1',
  createdAt: '2026-08-20T01:00:00.000Z',
  ...over,
});

describe('家長的請假頁', () => {
  beforeEach(() => {
    state.students = [{ id: 's1', name: '陳小宇' }];
    state.leaves = [];
    state.isLoading = false;
    state.isError = false;
    state.created = [];
  });

  // 家長多數時候是來查「上次那筆准了沒」，真正要申請時才需要表單。
  it('一進來看到的是結果與一顆按鈕，表單沒有攤在頁面上', () => {
    render(<ParentLeave />);
    expect(screen.getByRole('button', { name: /幫 陳小宇 請假/ })).toBeTruthy();
    expect(screen.queryByLabelText('發生什麼事')).toBeNull();
  });

  it('按下按鈕才從底部滑出表單', () => {
    render(<ParentLeave />);
    fireEvent.click(screen.getByRole('button', { name: /幫 陳小宇 請假/ }));
    expect(document.querySelector('dialog')?.open).toBe(true);
    expect(screen.getByRole('heading', { name: '幫 陳小宇 請假' })).toBeTruthy();
  });

  // 沒寫原因就送出的話，錯誤要貼在那個欄位旁邊，而且不能真的送出去。
  it('沒寫原因不會送出，並且就地說明', () => {
    render(<ParentLeave />);
    fireEvent.click(screen.getByRole('button', { name: /幫 陳小宇 請假/ }));
    fireEvent.click(screen.getByRole('button', { name: '送出請假' }));

    expect(state.created).toHaveLength(0);
    expect(screen.getByText('請寫一下原因，老師才知道發生什麼事。')).toBeTruthy();
  });

  it('填好原因就送得出去，類別會併進事由', () => {
    render(<ParentLeave />);
    fireEvent.click(screen.getByRole('button', { name: /幫 陳小宇 請假/ }));
    fireEvent.change(screen.getByPlaceholderText('例如：發燒需要在家休息'), {
      target: { value: '發燒' },
    });
    fireEvent.click(screen.getByRole('button', { name: '送出請假' }));

    expect(state.created).toHaveLength(1);
    expect((state.created[0] as { reason: string }).reason).toBe('病假：發燒');
  });

  it('狀態用色塊講，待審核是等待色不是錯誤色', () => {
    state.leaves = [leave({ status: 'PENDING' })];
    const { container } = render(<ParentLeave />);
    expect(screen.getByText('待審核')).toBeTruthy();
    expect(container.querySelector('.bg-wait-wash')).not.toBeNull();
  });

  // 樂觀更新那一列還沒有真正的 id，取消什麼都取消不了。
  it('送出中的那一列不宣稱狀態，也不給取消', () => {
    state.leaves = [leave({ id: 'optimistic:1' })];
    render(<ParentLeave />);
    expect(screen.getByText('送出中…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '取消這筆請假' })).toBeNull();
  });

  it('已核准的不能再取消變成駁回那種誤會', () => {
    state.leaves = [leave({ status: 'REJECTED' })];
    render(<ParentLeave />);
    expect(screen.queryByRole('button', { name: '取消這筆請假' })).toBeNull();
  });

  it('沒請過假時說的是「還沒請過假」，不是「無資料」', () => {
    render(<ParentLeave />);
    expect(screen.getByText('還沒有請過假')).toBeTruthy();
  });

  it('讀不到時給錯誤與重試，不是一片空白', () => {
    state.isError = true;
    render(<ParentLeave />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: '再試一次' })).toBeTruthy();
  });

  it('還沒綁定到孩子時說清楚該找誰', () => {
    state.students = [];
    render(<ParentLeave />);
    expect(screen.getByText('還沒有連結到孩子的資料')).toBeTruthy();
  });
});
