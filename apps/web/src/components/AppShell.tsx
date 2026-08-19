'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useBranding } from '../lib/branding';
import { clearBackTarget } from '../lib/backTarget';
import { Icon, type IconName } from './Icon';
import { PageTransition } from './PageTransition';

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/liff', label: '首頁', icon: 'home' },
  { href: '/liff/communication-book', label: '聯絡簿', icon: 'book' },
  { href: '/liff/notification', label: '訊息', icon: 'bell' },
  { href: '/liff/me', label: '我的', icon: 'user' },
];

// 只有家長首頁有 hero（封面圖）。其他頁一進來頁首就必須是實色，
// 否則會出現「白字浮在米白底上」看不見的頁首。
const HERO_PATH = '/liff';

// 捲多少才算「離開最頂端」。給一點餘裕，避免手指輕碰就閃色。
const SCROLL_THRESHOLD_PX = 8;

// 清葉外框：頁首（外框 logo + 襯線園名 + 通知鈴）+ 內容 + 底部頁籤。
// 頁首一律 sticky 固定在最上方;在首頁最頂端時透明疊在封面圖上，往下捲才換回實色底。
export function AppShell({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const pathname = usePathname();
  const hasHero = pathname === HERO_PATH;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!hasHero) return;
    const onScroll = (): void => setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    // 從別頁返回時瀏覽器會還原捲動位置，所以要先量一次現況，不能預設在頂端。
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasHero]);

  // 疊在封面圖上的狀態：透明底 + 白字。離開首頁或往下捲就結束。
  const overlay = hasHero && !scrolled;

  return (
    <div className="min-h-screen">
      {/* border-b 兩種狀態都留著（透明時只是看不見）——少了它頁首會矮 1px，
          捲動時整頁會跳一下。 */}
      <header
        className={`sticky top-0 z-30 border-b transition-colors duration-200 ${
          overlay ? 'border-transparent bg-transparent' : 'border-line bg-surface/85 backdrop-blur'
        }`}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          {/* min-w-0 + truncate：園名是園所自己填的，放大字級後長園名會把通知鈴擠出畫面。 */}
          <Link href="/liff" className="flex min-w-0 items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                className={`h-10 w-10 rounded-full border object-contain transition-colors ${
                  overlay ? 'border-white/60 bg-white/10' : 'border-brand-primary/40 bg-surface'
                }`}
              />
            ) : (
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] text-lg font-bold transition-colors"
                style={{
                  borderColor: overlay ? 'rgba(255,255,255,0.7)' : 'var(--brand-primary)',
                  color: overlay ? '#fff' : 'var(--brand-primary)',
                }}
              >
                {branding.brandName.charAt(0)}
              </span>
            )}
            <span
              className={`truncate font-serif text-xl font-semibold tracking-tight transition-colors ${
                overlay ? 'text-white' : 'text-ink'
              }`}
            >
              {branding.brandName}
            </span>
          </Link>

          <Link
            href="/liff/notification"
            aria-label="通知"
            title="通知"
            className={`ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
              overlay
                ? 'border-white/50 text-white hover:border-white'
                : 'border-line text-ink-soft hover:border-brand-primary hover:text-brand-primary'
            }`}
          >
            <Icon name="bell" className="h-5 w-5" />
          </Link>
        </div>

        {/* 封面圖不在此處 —— 只出現在首頁，且是完整的 hero（見 features/home/HomeHero）。
            Human Owner 決策 2026-08-17：每頁都掛一條橫帶會稀釋它，園所的門面應該只講一次、講得夠大。 */}
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-28 pt-7">
        <PageTransition>{children}</PageTransition>
      </main>

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
                className={`tappable flex flex-1 flex-col items-center gap-1 py-2.5 text-2xs font-semibold ${
                  active ? 'text-brand-primary' : 'text-ink-soft'
                }`}
              >
                <Icon name={tab.icon} className="h-[1.375rem] w-[1.375rem]" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
