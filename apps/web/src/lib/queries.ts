'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PublicConfig } from '@sproutin/shared';
import { loadPublicConfig } from './config';
import { fetchMyStudents, type StudentView } from './auth';

// 公開 runtime config（ADR-001）。BrandingProvider 與 SessionProvider 共享同一快取。
export function usePublicConfig(): UseQueryResult<PublicConfig> {
  return useQuery({
    queryKey: ['publicConfig'],
    queryFn: loadPublicConfig,
    staleTime: 5 * 60_000,
  });
}

// 目前使用者可查看的學生（後端依角色/scope 過濾）。授權走 cookie，前端不需傳 token。
// 這是**聯集**：老師拿到自班、園長拿到全校、家長拿到自己小孩。
export function useMyStudents(enabled = true): UseQueryResult<StudentView[]> {
  return useQuery({
    queryKey: ['myStudents'],
    queryFn: () => fetchMyStudents(),
    enabled,
  });
}

// 只有我監護的小孩。家長身分專用 —— 兼校方身分的人用聯集版會拿到整間學校的名單
// （Human Owner 2026-08-20 回報：切到家長身分後首頁出現別班學生的名字）。
// **各自的 queryKey**，不能和聯集版共用快取，否則兩邊會互相蓋掉。
export function useMyGuardianStudents(enabled = true): UseQueryResult<StudentView[]> {
  return useQuery({
    queryKey: ['myStudents', 'guardian'],
    queryFn: () => fetchMyStudents('GUARDIAN'),
    enabled,
  });
}

// 只有我實際帶的班上的孩子。導師身分專用 —— 園長兼導師的人用聯集版會拿到全校
// （Human Owner 2026-08-20 回報：只帶一班的導師在點名與聯絡簿看得到別班的孩子）。
export function useMyTeachingStudents(enabled = true): UseQueryResult<StudentView[]> {
  return useQuery({
    queryKey: ['myStudents', 'teaching'],
    queryFn: () => fetchMyStudents('TEACHING'),
    enabled,
  });
}
