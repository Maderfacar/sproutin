'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { SchoolAdminConfig } from '@sproutin/shared';
import { ApiError, apiGet, apiSend } from '../../lib/api';

// 園所設定（OWNER/ADMIN）。授權走 httpOnly cookie，前端不需傳 token。

export function useSchoolConfig(): UseQueryResult<SchoolAdminConfig> {
  return useQuery({
    queryKey: ['schoolConfig'],
    queryFn: () => apiGet<SchoolAdminConfig>('/api/school/config'),
  });
}

// 更新園所設定。成功後同時讓 publicConfig 重取 —— 品牌色/logo/卡片即刻套用到全站（BrandingProvider）。
export function useUpdateSchoolConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SchoolAdminConfig>) =>
      apiSend<SchoolAdminConfig>('/api/school/config', 'PATCH', body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['schoolConfig'], updated);
      void queryClient.invalidateQueries({ queryKey: ['publicConfig'] });
    },
  });
}

export type UploadKind = 'logo' | 'banner';

// 圖片上傳（→ Vercel Blob，回傳公開網址）。未設定 Blob Store 時後端回 503 upload_unconfigured。
export function useUploadImage() {
  return useMutation({
    mutationFn: async ({ kind, file }: { kind: UploadKind; file: File }): Promise<string> => {
      const form = new FormData();
      form.append('kind', kind);
      form.append('file', file);
      const res = await fetch('/api/uploads/image', {
        method: 'POST',
        body: form,
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
        throw new ApiError(res.status, data?.error?.code ?? `HTTP_${res.status}`);
      }
      const data = (await res.json()) as { url: string };
      return data.url;
    },
  });
}

export function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'upload_unconfigured':
        return '尚未啟用圖片上傳，請先選用內建圖庫或貼上圖片網址。';
      case 'unsupported_image_type':
        return '只接受 PNG / JPG / WebP 圖片。';
      case 'image_too_large':
        return '圖片超過 4MB，請換一張小一點的。';
      case 'out_of_scope':
        return '你沒有修改園所外觀的權限。';
      default:
        return `上傳失敗（${error.code}）。`;
    }
  }
  return '上傳失敗，請稍後再試。';
}
