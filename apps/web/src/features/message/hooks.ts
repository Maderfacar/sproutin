'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import { useScopedPersona } from '../../lib/useScopedPersona';
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
//
// **送出時把當下的身分一起帶上去**（Human Owner 2026-08-20 回報：同時是班導與某位學生的
// 家長時，兩種身分講的話長得一模一樣）。一個人可能同時是這個孩子的家長與這一班的導師，
// 而「這句是導師的指示」與「這句是某位媽媽的請求」對讀的人是兩件事。
//
// 桌面後台不套身分（useScopedPersona 回 null）→ 一律以校方身分發話，那本來就是後台的世界。
// 後端會對照事實再決定真正寫進去的值 —— 這是顯示用的標籤，不是權限。
export function useSendMessage() {
  const queryClient = useQueryClient();
  const persona = useScopedPersona();
  const senderAs: SendMessageBody['senderAs'] = persona === 'parent' ? 'GUARDIAN' : 'STAFF';

  return useMutation({
    mutationFn: (body: SendMessageBody) =>
      apiSend<MessageView>('/api/messages', 'POST', { senderAs, ...body }),
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
