'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type { AnnouncementView, CreateAnnouncementBody } from '../../lib/types';

// 授權走 httpOnly cookie，前端不需傳 token。

// 本人可見公告（全校 + 相關班級;後端過濾）。
export function useAnnouncements(): UseQueryResult<AnnouncementView[]> {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: () => apiGet<AnnouncementView[]>('/api/announcements'),
  });
}

// 發布公告（staff）。成功後讓公告列表重取。
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAnnouncementBody) => apiSend<AnnouncementView>('/api/announcements', 'POST', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

// 公告的異動一律要讓「訊息中心」也重取：刪掉一則公告之後，通知那一側查不到標題會
// 退回顯示分類名稱，不重取的話那一列會停在舊標題上。
function useAnnouncementMutation<TVariables>(mutationFn: (vars: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, TVariables>({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// 改標題／內文。**scope 與 classId 不可改**（後端 .strict() 會擋）——
// 換對象等於另一則公告，請刪掉重發。
export function useUpdateAnnouncement() {
  return useAnnouncementMutation<{ id: string; patch: { title?: string; body?: string } }>(
    ({ id, patch }) => apiSend<AnnouncementView>(`/api/announcements/${id}`, 'PATCH', patch),
  );
}

// 站內刪除。已送出的 LINE 推播收不回來 —— 那一句話要寫在確認面板上，不是藏在文件裡。
export function useDeleteAnnouncement() {
  return useAnnouncementMutation<{ id: string }>(({ id }) =>
    apiSend<void>(`/api/announcements/${id}`, 'DELETE'),
  );
}

// 後端擋下的情況翻成白話。
export function announcementErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'not_announcement_owner':
      return '這則不是你發的，只有園長、行政或發布的人自己能改或刪除。';
    case 'announcement_not_found':
      return '找不到這則公告，可能已經被刪掉了。';
    case 'no_changes':
      return '沒有改到任何東西。';
    case 'out_of_scope':
      return '你沒有這個班級的權限。';
    default:
      return fallback;
  }
}
