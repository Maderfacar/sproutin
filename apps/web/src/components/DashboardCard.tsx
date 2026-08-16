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
  /** 版型變體：grid=直式卡片;list=橫式列。 */
  variant?: 'grid' | 'list';
}

const iconChipStyle = { background: 'color-mix(in srgb, var(--brand-primary) 12%, #ffffff)' };

// 溫暖親和卡片。grid=直式（圖示在上）;list=橫式（圖示在左）。hover 輕抬、stagger 進場。
export function DashboardCard({
  title,
  description,
  icon,
  href,
  enabled,
  delay = 0,
  variant = 'grid',
}: DashboardCardProps) {
  const base = `rise-in card p-5 transition duration-300 ease-out-soft ${
    enabled ? 'hover:-translate-y-1 hover:shadow-lift' : 'border-dashed opacity-70'
  }`;

  const comingSoon = !enabled && (
    <span className="chip bg-black/5 text-ink-soft">即將推出</span>
  );

  const iconChip = (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
      style={iconChipStyle}
      aria-hidden
    >
      {icon}
    </span>
  );

  const inner =
    variant === 'list' ? (
      <div className={`${base} flex items-center gap-4`} style={{ animationDelay: `${delay}s` }}>
        {iconChip}
        <div className="min-w-0">
          <p className="font-extrabold text-ink">{title}</p>
          <p className="mt-0.5 truncate text-sm text-ink-soft">{description}</p>
        </div>
        <div className="ml-auto">{enabled ? <span className="text-ink-soft">›</span> : comingSoon}</div>
      </div>
    ) : (
      <div className={`${base} flex h-full flex-col gap-3`} style={{ animationDelay: `${delay}s` }}>
        <div className="flex items-start">
          {iconChip}
          {!enabled && <span className="ml-auto">{comingSoon}</span>}
        </div>
        <div>
          <p className="font-extrabold text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{description}</p>
        </div>
      </div>
    );

  if (enabled && href) {
    return (
      <Link
        href={href}
        className="block rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
      >
        {inner}
      </Link>
    );
  }
  return <div aria-disabled>{inner}</div>;
}
