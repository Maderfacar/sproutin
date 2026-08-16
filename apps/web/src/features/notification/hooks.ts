'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type { NotificationView } from '../../lib/types';

// 授權走 httpOnly cookie，前端不需傳 token。

// 本人站內通知（後端以 userId 過濾）。
export function useNotifications(): UseQueryResult<NotificationView[]> {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<NotificationView[]>('/api/notifications'),
  });
}

// 標記通知已讀。成功後讓通知列表重取。
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend<NotificationView>(`/api/notifications/${encodeURIComponent(id)}/read`, 'PATCH'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
