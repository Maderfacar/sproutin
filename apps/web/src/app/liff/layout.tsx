'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePublicConfig } from '../../lib/queries';
import { BrandingProvider } from '../../lib/branding';
import { SessionProvider } from '../../lib/session';
import { resolveLiffStatePath } from '../../lib/liffState';
import { AppShell } from '../../components/AppShell';
import { StatusScreen } from '../../components/StatusScreen';
import { DocumentTitle } from '../../components/DocumentTitle';

// /liff/* 的共用外框：先處理 LINE 指定的目的頁 → 取 runtime config（品牌 + liffId）
// → 套品牌 → LIFF 登入 → AppShell。
export default function LiffLayout({ children }: { children: ReactNode }) {
  const { data: config, isLoading, isError, error, refetch } = usePublicConfig();
  const router = useRouter();
  const pathname = usePathname();
  // 轉址期間不要先渲染首頁再閃到目的頁。
  const [redirecting, setRedirecting] = useState(false);

  // 從 LINE 圖文選單點進來時，目的頁放在 liff.state。已登入者不會跑 liff.init()，
  // 沒人處理這個參數 → 每一格都只會停在首頁。這裡自己接手（見 lib/liffState）。
  useEffect(() => {
    const target = resolveLiffStatePath(window.location.search);
    if (target && target !== pathname) {
      setRedirecting(true);
      router.replace(target);
    }
  }, [router, pathname]);

  if (redirecting) {
    return <StatusScreen fullScreen status="loading" />;
  }
  if (isLoading) {
    return <StatusScreen fullScreen status="loading" message="載入園所設定中…" />;
  }
  if (isError || !config) {
    return (
      <StatusScreen
        fullScreen
        status="error"
        message={error instanceof Error ? error.message : '無法載入園所設定'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <BrandingProvider config={config}>
      <DocumentTitle />
      <SessionProvider liffId={config.liffId}>
        <AppShell>{children}</AppShell>
      </SessionProvider>
    </BrandingProvider>
  );
}
