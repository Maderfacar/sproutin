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

// 清葉外框：清爽頁首（外框 logo + 襯線園名 + 外框通知鈴）+ 選用 banner + 內容容器。
export function AppShell({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const { user } = useSession();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link href="/liff" className="flex items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                className="h-10 w-10 rounded-full border border-brand-primary/40 bg-surface object-contain"
              />
            ) : (
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] text-lg font-bold"
                style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
              >
                {branding.brandName.charAt(0)}
              </span>
            )}
            <span className="font-serif text-xl font-semibold tracking-tight text-ink">
              {branding.brandName}
            </span>
          </Link>

          <Link
            href="/liff/notification"
            aria-label="通知"
            title="通知"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-brand-primary hover:text-brand-primary"
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

      <main className="mx-auto max-w-2xl px-5 py-7">{children}</main>

      <footer className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-5 pb-9 pt-2 text-center text-xs text-ink-soft">
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
