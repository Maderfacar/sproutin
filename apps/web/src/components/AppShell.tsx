'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useBranding } from '../lib/branding';
import { useSession } from '../lib/session';

// 全站外框：園方品牌頁首（logo + 名稱）+ 選用 banner + 內容容器。
// 品牌值皆來自 runtime config（ADR-001）。
export function AppShell({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const { user } = useSession();

  return (
    <div className="min-h-screen">
      <header className="bg-brand-primary text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/liff" className="flex items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                className="h-9 w-9 rounded-full bg-white object-contain"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                {branding.brandName.charAt(0)}
              </span>
            )}
            <span className="text-lg font-semibold">{branding.brandName}</span>
          </Link>
          <span className="ml-auto text-sm text-white/80">{user.displayName}</span>
        </div>
      </header>

      {branding.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.bannerUrl}
          alt=""
          className="h-32 w-full object-cover"
        />
      )}

      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
