'use client';

import type { ReactNode } from 'react';
import { usePublicConfig } from '../../lib/queries';
import { BrandingProvider } from '../../lib/branding';
import { SessionProvider } from '../../lib/session';
import { PreviewProvider } from '../../lib/preview';
import { AppShell } from '../../components/AppShell';
import { StatusScreen } from '../../components/StatusScreen';

// /liff/* 的共用外框：先取 runtime config（品牌 + liffId）→ 套品牌 → LIFF 登入 → AppShell。
export default function LiffLayout({ children }: { children: ReactNode }) {
  const { data: config, isLoading, isError } = usePublicConfig();

  if (isLoading) {
    return <StatusScreen status="loading" message="載入園所設定中…" />;
  }
  if (isError || !config) {
    return <StatusScreen status="error" message="無法載入園所設定（/config/public）" />;
  }

  return (
    <PreviewProvider>
      <BrandingProvider config={config}>
        <SessionProvider liffId={config.liffId}>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </BrandingProvider>
    </PreviewProvider>
  );
}
