'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { CreateLeaveBody, LeaveView, UpdateLeaveStatusBody } from '../../lib/types';

// 某學生的請假紀錄（後端 scope 過濾）。
export function useLeaves(studentId: string | undefined): UseQueryResult<LeaveView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['leaves', studentId],
    queryFn: () => apiGet<LeaveView[]>(`/api/leaves?studentId=${encodeURIComponent(studentId!)}`, accessToken),
    enabled: Boolean(studentId),
  });
}

// 申請請假。成功後讓該學生的請假清單重取。
export function useCreateLeave() {
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLeaveBody) => apiSend<LeaveView>('/api/leaves', accessToken, 'POST', body),
    onSuccess: (_data, body) => {
      void queryClient.invalidateQueries({ queryKey: ['leaves', body.studentId] });
    },
  });
}

// 取消請假。成功後讓所有請假清單重取。
export function useCancelLeave() {
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leaveId: string) =>
      apiSend<LeaveView>(`/api/leaves/${encodeURIComponent(leaveId)}/cancel`, accessToken, 'PATCH'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

// 整班待審請假（老師審核用,Step 7c）。
export function useClassPendingLeaves(classId: string | undefined): UseQueryResult<LeaveView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['leaves', 'class', classId, 'PENDING'],
    queryFn: () =>
      apiGet<LeaveView[]>(
        `/api/leaves?classId=${encodeURIComponent(classId!)}&status=PENDING`,
        accessToken,
      ),
    enabled: Boolean(classId),
  });
}

// 審核（approve/reject）。成功後讓所有請假清單重取。
export function useSetLeaveStatus() {
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveId, body }: { leaveId: string; body: UpdateLeaveStatusBody }) =>
      apiSend<LeaveView>(`/api/leaves/${encodeURIComponent(leaveId)}/status`, accessToken, 'PATCH', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}
