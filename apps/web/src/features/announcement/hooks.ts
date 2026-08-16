'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { AnnouncementView } from '../../lib/types';

// 本人可見公告（全校 + 相關班級;後端過濾）。
export function useAnnouncements(): UseQueryResult<AnnouncementView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['announcements'],
    queryFn: () => apiGet<AnnouncementView[]>('/api/announcements', accessToken),
  });
}
