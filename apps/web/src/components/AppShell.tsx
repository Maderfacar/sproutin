'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useBranding } from '../lib/branding';
import { useSession } from '../lib/session';
import { logout } from '../lib/auth';

async function handleLogout(): Promise<void> {
  await logout();
  // 清 cookie 後重載 → SessionProvider 會走 LINE 重新登入。
  window.location.reload();
}

// 溫暖親和外框：柔和品牌漸層頁首（logo + 名稱 + 通知鈴）+ 選用 banner + 內容容器。
export function AppShell({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const { user } = useSession();

  return (
    <div className="min-h-screen">
      <header
        className="text-white"
        style={{
          background:
            'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 60%, #ffffff))',
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link href="/liff" className="flex items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                className="h-10 w-10 rounded-2xl bg-white object-contain shadow-sm"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/25 text-lg font-extrabold backdrop-blur">
                {branding.brandName.charAt(0)}
              </span>
            )}
            <span className="text-lg font-extrabold tracking-tight">{branding.brandName}</span>
          </Link>

          <Link
            href="/liff/notification"
            aria-label="通知"
            title="通知"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg transition hover:bg-white/30"
          >
            🔔
          </Link>
        </div>

        {branding.bannerUrl && (
          <div className="mx-auto max-w-2xl px-5 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={branding.bannerUrl}
              alt=""
              className="h-32 w-full rounded-card object-cover shadow-soft"
            />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">{children}</main>

      <footer className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-5 pb-8 pt-2 text-center text-xs text-ink-soft">
        <span>
          {branding.brandName}｜{user.displayName}
        </span>
        <span aria-hidden>·</span>
        <button type="button" onClick={handleLogout} className="underline transition hover:text-ink">
          登出
        </button>
      </footer>
    </div>
  );
}
