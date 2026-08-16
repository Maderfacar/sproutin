'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { AnnouncementView, CreateAnnouncementBody } from '../../lib/types';

// 本人可見公告（全校 + 相關班級;後端過濾）。
export function useAnnouncements(): UseQueryResult<AnnouncementView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['announcements'],
    queryFn: () => apiGet<AnnouncementView[]>('/api/announcements', accessToken),
  });
}

// 發布公告（staff）。成功後讓公告列表重取。
export function useCreateAnnouncement() {
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAnnouncementBody) =>
      apiSend<AnnouncementView>('/api/announcements', accessToken, 'POST', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}
