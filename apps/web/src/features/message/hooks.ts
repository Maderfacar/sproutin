'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { MessageView, SendMessageBody } from '../../lib/types';

// 某學生的訊息串（雙向;後端 scope 過濾 + 推導 isRead）。
export function useMessages(studentId: string | undefined): UseQueryResult<MessageView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['messages', studentId],
    queryFn: () =>
      apiGet<MessageView[]>(`/api/messages?studentId=${encodeURIComponent(studentId!)}`, accessToken),
    enabled: Boolean(studentId),
  });
}

// 發訊（家長↔校方）。成功後讓該生訊息串重取。
export function useSendMessage() {
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessageBody) => apiSend<MessageView>('/api/messages', accessToken, 'POST', body),
    onSuccess: (_data, body) => {
      void queryClient.invalidateQueries({ queryKey: ['messages', body.studentId] });
    },
  });
}

// 標記單則訊息已讀。成功後讓該生訊息串重取。
export function useMarkMessageRead(studentId: string | undefined) {
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      apiSend<{ ok: true }>(`/api/messages/${encodeURIComponent(messageId)}/read`, accessToken, 'PATCH'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', studentId] });
    },
  });
}
