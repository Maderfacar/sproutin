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
