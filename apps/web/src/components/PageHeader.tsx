'use client';

import Link from 'next/link';

// 子頁共用頁首:返回 Dashboard + 標題（溫暖親和）。
export function PageHeader({ title }: { title: string }) {
  return (
    <div className="rise-in flex flex-col gap-2">
      <Link
        href="/liff"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand-primary transition hover:opacity-80"
      >
        ‹ 返回
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
    </div>
  );
}
