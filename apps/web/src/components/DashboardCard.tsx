'use client';

import Link from 'next/link';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: string;
  href?: string;
  enabled: boolean;
  /** 進場動畫延遲（stagger），秒。 */
  delay?: number;
}

// 溫暖親和卡片：圓角、柔和陰影、品牌色圖示底、hover 輕抬。未啟用＝虛線 + 即將推出。
export function DashboardCard({ title, description, icon, href, enabled, delay = 0 }: DashboardCardProps) {
  const inner = (
    <div
      className={`rise-in flex h-full flex-col gap-3 rounded-card border bg-surface p-5 transition duration-300 ease-out-soft ${
        enabled
          ? 'border-line shadow-soft hover:-translate-y-1 hover:shadow-lift'
          : 'border-dashed border-line opacity-70'
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
          style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, #ffffff)' }}
          aria-hidden
        >
          {icon}
        </span>
        {!enabled && (
          <span className="ml-auto rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
            即將推出
          </span>
        )}
      </div>
      <div>
        <p className="font-extrabold text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{description}</p>
      </div>
    </div>
  );

  if (enabled && href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 rounded-card">
        {inner}
      </Link>
    );
  }
  return <div aria-disabled>{inner}</div>;
}
