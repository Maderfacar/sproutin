'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useBranding } from '../../lib/branding';
import { useActivePersona } from '../../lib/usePersona';
import { AppBar } from '../ui/AppBar';
import { TabBar } from '../ui/TabBar';
import { Icon } from '../Icon';
import { PageTransition } from '../PageTransition';
import { PersonaSwitcher } from './PersonaSwitcher';
import { PERSONA_TABS } from './tabs';

// 三套殼。同一份元件、同一套 token、同一組 API，差別只有底部四格與頁首左邊那一塊。
//
// 家長的頁首放園所 logo 與名字 —— 他要的是「這是我孩子的學校」。
// 校方的頁首放身分鈕 —— 他要的是「我現在以什麼身分在看」（只有多重身分的人有）。
// 隨車老師沒有底部頁籤：一條路線點完就關掉，四個頁籤對他是負擔。
//
// 這個殼還沒接到 /liff 的 layout 上 —— 頁面本身要到第二批（家長 6 頁）才會照新版重做，
// 現在就換殼會變成新頁籤配舊頁面，反而更難懂。

function todayLabel(): string {
  const d = new Date();
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} 週${week}`;
}

export function PersonaShell({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const { persona } = useActivePersona();
  const tabs = PERSONA_TABS[persona];
  const isStaffSide = persona !== 'parent';

  // 校方的頁首左邊是身分鈕；但只有一種身分的老師沒有那顆鈕，
  // 這時要退回園所識別，否則頁首左邊會空一塊。
  const switcher = <PersonaSwitcher />;
  const brand = (
    <Link href="/liff" className="flex min-w-0 items-center gap-3">
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoUrl}
          alt={branding.brandName}
          className="h-10 w-10 rounded-full border border-brand-primary/40 bg-surface object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-brand-primary text-lg font-bold text-brand-primary"
        >
          {branding.brandName.charAt(0)}
        </span>
      )}
      {/* min-w-0 + truncate：園名是園所自己填的，放大字級後長園名會把右邊擠出畫面。 */}
      <span className="truncate font-serif text-xl font-semibold tracking-tight text-ink">
        {branding.brandName}
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen">
      <AppBar
        lead={
          isStaffSide ? (
            <div className="flex min-w-0 items-center gap-3">
              {switcher}
              <span className="truncate font-serif text-lg font-semibold tracking-tight text-ink">
                {branding.brandName}
              </span>
            </div>
          ) : (
            brand
          )
        }
        meta={todayLabel()}
        trailing={
          <Link
            href="/liff/notification"
            aria-label="通知"
            className="tappable flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-soft"
          >
            <Icon name="bell" className="h-5 w-5" />
          </Link>
        }
      />

      <main className={`mx-auto max-w-2xl px-5 pt-7 ${tabs.length > 0 ? 'pb-28' : 'pb-10'}`}>
        <PageTransition>{children}</PageTransition>
      </main>

      {tabs.length > 0 && <TabBar tabs={tabs} />}
    </div>
  );
}
