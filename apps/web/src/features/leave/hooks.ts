'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type { CreateLeaveBody, LeaveView, UpdateLeaveStatusBody } from '../../lib/types';

// 授權走 httpOnly cookie（same-origin 自動帶），前端不需傳 token。

// 某學生的請假紀錄（後端 scope 過濾）。
export function useLeaves(studentId: string | undefined): UseQueryResult<LeaveView[]> {
  return useQuery({
    queryKey: ['leaves', studentId],
    queryFn: () => apiGet<LeaveView[]>(`/api/leaves?studentId=${encodeURIComponent(studentId!)}`),
    enabled: Boolean(studentId),
  });
}

// 申請請假。成功後讓**所有**請假清單重取。
// 注意不能只失效 ['leaves', studentId]：老師的整班待審 ['leaves','class',...] 與園長的全校待審
// ['leaves','school','PENDING'] 是不同的 key，前綴不相符 → 會漏掉，使用者得手動重整才看得到新申請
// （Human Owner 2026-08-17 實測回報）。統一用前綴 ['leaves'] 一次失效，與取消/審核一致。
// 樂觀更新用的暫時 id。伺服器才知道真正的 id 與審核狀態，所以這一列**不假裝**自己已經
// 「待審核」—— 它顯示「送出中…」，也不給取消按鈕（還沒有 id，取消什麼都取消不了）。
const OPTIMISTIC_LEAVE_PREFIX = 'optimistic:';

/** 這一列是不是還沒被伺服器確認的暫時列。 */
export function isOptimisticLeave(leave: LeaveView): boolean {
  return leave.id.startsWith(OPTIMISTIC_LEAVE_PREFIX);
}

// 送出當下先畫出來的那一列。不知道的欄位一律留空，不要編一個看起來像真的的值。
function optimisticLeave(body: CreateLeaveBody): LeaveView {
  return {
    id: `${OPTIMISTIC_LEAVE_PREFIX}${Date.now()}`,
    studentId: body.studentId,
    dateFrom: body.dateFrom,
    dateTo: body.dateTo,
    reason: body.reason,
    status: 'PENDING',
    reviewedBy: null,
    reviewNote: null,
    createdBy: '',
    createdAt: new Date().toISOString(),
  };
}

// 送出的當下先把那一列畫進自己的請假清單（Human Owner 2026-08-19 排入）——
// 手機上按下送出之後如果清單沒有任何變化，家長會不確定到底送出去了沒，於是再按一次。
// 失敗就把清單復原（錯誤由表單講出來），不留下一列不存在的假資料。
export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLeaveBody) => apiSend<LeaveView>('/api/leaves', 'POST', body),
    onMutate: async (body: CreateLeaveBody) => {
      const key = ['leaves', body.studentId];
      // 先擋下進行中的重取，否則它回來時會把樂觀那一列蓋掉。
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LeaveView[]>(key);
      if (previous) {
        // 後端是 createdAt 由新到舊，所以新的排最前面。
        queryClient.setQueryData<LeaveView[]>(key, [optimisticLeave(body), ...previous]);
      }
      return { key, previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

// 取消請假。成功後讓所有請假清單重取。
export function useCancelLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leaveId: string) =>
      apiSend<LeaveView>(`/api/leaves/${encodeURIComponent(leaveId)}/cancel`, 'PATCH'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

// 整班待審請假（老師審核用,Step 7c）。
export function useClassPendingLeaves(classId: string | undefined): UseQueryResult<LeaveView[]> {
  return useQuery({
    queryKey: ['leaves', 'class', classId, 'PENDING'],
    queryFn: () =>
      apiGet<LeaveView[]>(`/api/leaves?classId=${encodeURIComponent(classId!)}&status=PENDING`),
    enabled: Boolean(classId),
  });
}

// 全校待審請假（園長/行政全校視角,Step 7d）。enabled 由呼叫端依角色控制。
export function useSchoolPendingLeaves(enabled: boolean): UseQueryResult<LeaveView[]> {
  return useQuery({
    queryKey: ['leaves', 'school', 'PENDING'],
    queryFn: () => apiGet<LeaveView[]>('/api/leaves?status=PENDING'),
    enabled,
  });
}

// 審核（approve/reject）。成功後讓所有請假清單重取。
export function useSetLeaveStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveId, body }: { leaveId: string; body: UpdateLeaveStatusBody }) =>
      apiSend<LeaveView>(`/api/leaves/${encodeURIComponent(leaveId)}/status`, 'PATCH', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}
