'use client';

import Link from 'next/link';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: string;
  href?: string;
  enabled: boolean;
}

// Dashboard 卡片。未啟用（本階段尚未實作的功能）顯示為「即將推出」，不可點擊。
export function DashboardCard({ title, description, icon, href, enabled }: DashboardCardProps) {
  const inner = (
    <div
      className={`flex h-full flex-col gap-1 rounded-card border bg-white p-4 transition ${
        enabled
          ? 'border-gray-200 hover:border-brand-primary hover:shadow-md'
          : 'border-dashed border-gray-200 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <span className="font-semibold text-gray-900">{title}</span>
        {!enabled && (
          <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            即將推出
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );

  if (enabled && href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return <div aria-disabled>{inner}</div>;
}
