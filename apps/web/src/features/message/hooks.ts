'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type { MessageView, SendMessageBody } from '../../lib/types';

// 授權走 httpOnly cookie，前端不需傳 token。

// 某學生的訊息串（雙向;後端 scope 過濾 + 推導 isRead）。
export function useMessages(studentId: string | undefined): UseQueryResult<MessageView[]> {
  return useQuery({
    queryKey: ['messages', studentId],
    queryFn: () => apiGet<MessageView[]>(`/api/messages?studentId=${encodeURIComponent(studentId!)}`),
    enabled: Boolean(studentId),
  });
}

// 發訊（家長↔校方）。成功後讓該生訊息串重取。
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessageBody) => apiSend<MessageView>('/api/messages', 'POST', body),
    onSuccess: (_data, body) => {
      void queryClient.invalidateQueries({ queryKey: ['messages', body.studentId] });
    },
  });
}

// 標記單則訊息已讀。成功後讓該生訊息串重取。
export function useMarkMessageRead(studentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      apiSend<{ ok: true }>(`/api/messages/${encodeURIComponent(messageId)}/read`, 'PATCH'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', studentId] });
    },
  });
}
