'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { NotificationView } from '../../lib/types';

// 本人站內通知（後端以 userId 過濾）。
export function useNotifications(): UseQueryResult<NotificationView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<NotificationView[]>('/api/notifications', accessToken),
  });
}

// 標記通知已讀。成功後讓通知列表重取。
export function useMarkNotificationRead() {
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend<NotificationView>(`/api/notifications/${encodeURIComponent(id)}/read`, accessToken, 'PATCH'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
