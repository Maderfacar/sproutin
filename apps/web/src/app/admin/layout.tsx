'use client';

import type { ReactNode } from 'react';
import { usePublicConfig } from '../../lib/queries';
import { BrandingProvider } from '../../lib/branding';
import { StatusScreen } from '../../components/StatusScreen';

// /admin/* 的最外層：只負責園所品牌（顏色 / 園徽 / 園名）。
// 身分驗證刻意不放這裡 —— /admin/login 與 /admin/bind 本來就還沒有身分，
// 需要身分的頁面統一放在 (app) 群組內，由那一層的 AdminSessionProvider 把關。
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: config, isLoading, isError, error, refetch } = usePublicConfig();

  if (isLoading) {
    return <StatusScreen status="loading" message="載入園所設定中…" />;
  }
  if (isError || !config) {
    return (
      <StatusScreen
        status="error"
        message={error instanceof Error ? error.message : '無法載入園所設定'}
        onRetry={() => void refetch()}
      />
    );
  }

  return <BrandingProvider config={config}>{children}</BrandingProvider>;
}
