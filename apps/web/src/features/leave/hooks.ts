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

// 申請請假。成功後讓該學生的請假清單重取。
export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLeaveBody) => apiSend<LeaveView>('/api/leaves', 'POST', body),
    onSuccess: (_data, body) => {
      void queryClient.invalidateQueries({ queryKey: ['leaves', body.studentId] });
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
