'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useBranding } from '../lib/branding';
import { clearBackTarget } from '../lib/backTarget';
import { Icon, type IconName } from './Icon';

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/liff', label: '首頁', icon: 'home' },
  { href: '/liff/communication-book', label: '聯絡簿', icon: 'book' },
  { href: '/liff/notification', label: '通知', icon: 'bell' },
  { href: '/liff/me', label: '我的', icon: 'user' },
];

// 清葉外框：清爽頁首（外框 logo + 襯線園名 + 外框通知鈴）+ 選用 banner + 內容 + 底部頁籤。
export function AppShell({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const pathname = usePathname();

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
            <Icon name="bell" className="h-5 w-5" />
          </Link>
        </div>

        {/* 封面圖不在此處 —— 只出現在首頁，且是完整的 hero（見 features/home/HomeHero）。
            Human Owner 決策 2026-08-17：每頁都掛一條橫帶會稀釋它，園所的門面應該只講一次、講得夠大。 */}
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-28 pt-7">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
        <div
          className="mx-auto flex max-w-2xl items-stretch justify-around"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {TABS.map((tab) => {
            const active = tab.href === '/liff' ? pathname === '/liff' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                // 按了底部頁籤＝決定留在手機版 → 忘掉「從後台進來」這條線，返回鍵回手機版首頁。
                onClick={clearBackTarget}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition ${
                  active ? 'text-brand-primary' : 'text-ink-soft'
                }`}
              >
                <Icon name={tab.icon} className="h-[22px] w-[22px]" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
