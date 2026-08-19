'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useBranding } from '../../lib/branding';
import { useActivePersona } from '../../lib/usePersona';
import { TabBar } from '../ui/TabBar';
import { Icon } from '../Icon';
import { PageTransition } from '../PageTransition';
import { PersonaSwitcher } from './PersonaSwitcher';
import { PERSONA_TABS } from './tabs';

// 三套殼。同一份元件、同一套 token、同一組 API，差別只有底部四格。
//
// 頁首的形狀對每一種身分都一樣：**左邊園所識別、右邊身分鈕 + 通知鈴**。
// 早先的版本讓左邊隨身分變形（校方是身分鈕、家長是 logo），結果切到家長之後
// 那顆鈕就消失了 —— 等於把人關在家長身分裡出不來（Human Owner 2026-08-20 回報）。
// 切換是雙向的，出口不能只有一半；固定位置也讓人知道去哪裡找它。

// 只有家長首頁有封面圖（HomeHero）。其他頁一進來頁首就必須是實色，
// 否則會出現「白字浮在米白底上」看不見的頁首。
const HERO_PATH = '/liff';

// 捲多少才算「離開最頂端」。給一點餘裕，避免手指輕碰就閃色。
const SCROLL_THRESHOLD_PX = 8;

export function PersonaShell({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const pathname = usePathname();
  const { persona } = useActivePersona();
  const tabs = PERSONA_TABS[persona];

  // 封面圖只在家長首頁 —— 校方的首頁是待辦清單，沒有圖可以疊。
  const hasHero = persona === 'parent' && pathname === HERO_PATH;
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
        className={`sticky top-0 z-30 border-b transition-colors duration-base ${
          overlay ? 'border-transparent bg-transparent' : 'border-line bg-surface/85 backdrop-blur'
        }`}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-5 py-4">
          {/* min-w-0 + truncate：園名是園所自己填的，放大字級後長園名會把右邊擠出畫面。 */}
          <Link href="/liff" className="flex min-w-0 flex-1 items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                className={`h-10 w-10 shrink-0 rounded-full border object-contain transition-colors ${
                  overlay ? 'border-white/60 bg-white/10' : 'border-brand-primary/40 bg-surface'
                }`}
              />
            ) : (
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] text-lg font-bold transition-colors"
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

          {/* 多重身分的人在每一種身分下都看得到這顆鈕，位置固定不變。 */}
          <PersonaSwitcher overlay={overlay} />

          <Link
            href="/liff/notification"
            aria-label="通知"
            className={`tappable flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
              overlay
                ? 'border-white/50 text-white hover:border-white'
                : 'border-line text-ink-soft hover:border-brand-primary hover:text-brand-primary'
            }`}
          >
            <Icon name="bell" className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className={`mx-auto max-w-2xl px-5 pt-7 ${tabs.length > 0 ? 'pb-28' : 'pb-10'}`}>
        <PageTransition>{children}</PageTransition>
      </main>

      {tabs.length > 0 && <TabBar tabs={tabs} />}
    </div>
  );
}
