'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PublicConfig } from '@sproutin/shared';
import { loadPublicConfig } from './config';
import { fetchMyStudents, type StudentView } from './auth';
import { useSession } from './session';

// 公開 runtime config（ADR-001）。BrandingProvider 與 SessionProvider 共享同一快取。
export function usePublicConfig(): UseQueryResult<PublicConfig> {
  return useQuery({
    queryKey: ['publicConfig'],
    queryFn: loadPublicConfig,
    staleTime: 5 * 60_000,
  });
}

// 目前使用者可查看的學生（後端依角色/scope 過濾：自己小孩 ∪ 自班 ∪ 全校）。
export function useMyStudents(): UseQueryResult<StudentView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['myStudents'],
    queryFn: () => fetchMyStudents(accessToken),
  });
}
