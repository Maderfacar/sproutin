import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCreateLeave, isOptimisticLeave } from './hooks';
import type { LeaveView } from '../../lib/types';

// Human Owner 2026-08-19 排入：按下送出之後，清單要立刻長出那一列。
// 在手機上如果按了沒有任何變化，家長會不確定送出去了沒，於是再按一次。
const state = vi.hoisted(() => ({ fail: false }));

vi.mock('../../lib/api', () => ({
  apiSend: vi.fn(async () => {
    if (state.fail) throw new Error('boom');
    return { id: 'srv-1' } as LeaveView;
  }),
  apiGet: vi.fn(),
  ApiError: class extends Error {},
}));

const existing: LeaveView = {
  id: 'lv-old',
  studentId: 'stu-1',
  dateFrom: '2026-08-10T00:00:00.000Z',
  dateTo: '2026-08-10T00:00:00.000Z',
  reason: '病假：發燒',
  status: 'APPROVED',
  reviewedBy: 'u-teacher',
  reviewNote: null,
  createdBy: 'u-parent',
  createdAt: '2026-08-09T02:00:00.000Z',
};

const body = {
  studentId: 'stu-1',
  dateFrom: '2026-08-19T00:00:00.000Z',
  dateTo: '2026-08-19T00:00:00.000Z',
  reason: '事假：家中有事',
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(['leaves', 'stu-1'], [existing]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCreateLeave(), { wrapper });
  const rows = (): LeaveView[] => client.getQueryData(['leaves', 'stu-1']) ?? [];
  return { result, rows };
}

describe('請假送出的樂觀更新', () => {
  beforeEach(() => {
    state.fail = false;
  });

  it('送出的當下就長出一列，排在最前面（後端是新的在上）', async () => {
    const { result, rows } = setup();
    result.current.mutate(body);

    await waitFor(() => expect(rows()).toHaveLength(2));
    const first = rows()[0]!;
    expect(isOptimisticLeave(first)).toBe(true);
    expect(first.reason).toBe('事假：家中有事');
    expect(rows()[1]!.id).toBe('lv-old');
  });

  // 伺服器才知道真正的 id 與審核狀態 —— 那一列不能假裝自己已經是「待審核」。
  it('暫時的那一列認得出來，不會被當成真的紀錄', async () => {
    const { result, rows } = setup();
    result.current.mutate(body);

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(rows()[0]!.id.startsWith('optimistic:')).toBe(true);
    expect(isOptimisticLeave(rows()[1]!)).toBe(false);
  });

  // 不要留下一列不存在的假資料：失敗就復原（錯誤由表單講出來）。
  it('送不出去就把清單復原', async () => {
    state.fail = true;
    const { result, rows } = setup();
    result.current.mutate(body);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(rows()).toHaveLength(1);
    expect(rows()[0]!.id).toBe('lv-old');
  });

  it('清單還沒載入過就不硬塞（沒有可以復原的東西）', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateLeave(), { wrapper });
    result.current.mutate(body);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(['leaves', 'stu-1'])).toBeUndefined();
  });
});
