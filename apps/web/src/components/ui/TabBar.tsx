'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearBackTarget } from '../../lib/backTarget';
import { Icon, type IconName } from '../Icon';

export interface TabItem {
  href: string;
  label: string;
  icon: IconName;
  /** 首頁那一格：只有完全相符才算選中，否則所有子頁都會把它點亮。 */
  exact?: boolean;
}

// 底部頁籤。三個殼各自帶自己的四格 —— 這是「一次只做一種身分」最外顯的地方。
//
// 四格是上限。第五格開始使用者就要用找的，那等於回到「先讀一遍才知道去哪」。
// 放不下的東西收進「我的」那一格，不要硬擠。

interface TabBarProps {
  tabs: readonly TabItem[];
}

export function TabBar({ tabs }: TabBarProps) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
      <div
        className="mx-auto flex max-w-2xl items-stretch justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              // 按了底部頁籤＝決定留在手機版 → 忘掉「從後台進來」這條線，返回鍵回手機版首頁。
              onClick={clearBackTarget}
              aria-current={active ? 'page' : undefined}
              className={`tappable flex min-h-touch flex-1 flex-col items-center justify-center gap-1 py-2.5 text-2xs font-bold ${
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
  );
}
