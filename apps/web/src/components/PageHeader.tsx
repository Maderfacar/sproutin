'use client';

import Link from 'next/link';
import { Icon } from './Icon';

// 子頁共用頁首：返回 + 襯線標題（清葉）。
export function PageHeader({ title }: { title: string }) {
  return (
    <div className="rise-in mb-1 flex items-center gap-3">
      <Link
        href="/liff"
        aria-label="返回"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-brand-primary hover:text-brand-primary"
      >
        <Icon name="chev" className="h-4 w-4 rotate-180" />
      </Link>
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">{title}</h1>
    </div>
  );
}
