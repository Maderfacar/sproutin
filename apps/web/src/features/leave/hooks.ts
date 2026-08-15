'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { CreateLeaveBody, LeaveView } from '../../lib/types';

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
