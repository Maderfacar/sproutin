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
export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLeaveBody) => apiSend<LeaveView>('/api/leaves', 'POST', body),
    onSuccess: () => {
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
