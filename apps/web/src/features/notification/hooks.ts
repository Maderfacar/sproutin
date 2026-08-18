'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type { NotificationView } from '../../lib/types';

// 授權走 httpOnly cookie，前端不需傳 token。

const KEY = ['notifications'];

// 本人站內通知（後端以 userId 過濾）。
export function useNotifications(): UseQueryResult<NotificationView[]> {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<NotificationView[]>('/api/notifications'),
  });
}

/**
 * 標記通知已讀。**樂觀更新**：點下去那一刻小圓點就消失，不等伺服器回來
 * —— 在訊息中心裡點一則就同時要跳頁，等回應才變的話小圓點會在離開後才消失。
 * 失敗就把清單復原（不靜默吞掉：復原本身就是看得見的回饋）。
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend<NotificationView>(`/api/notifications/${encodeURIComponent(id)}/read`, 'PATCH'),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<NotificationView[]>(KEY);
      queryClient.setQueryData<NotificationView[]>(KEY, (old) =>
        old?.map((n) => (n.id === id && n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(KEY, context.previous);
      }
    },
    // 成功或失敗都以伺服器為準重取一次。
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
