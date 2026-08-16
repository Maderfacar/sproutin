'use client';

import Link from 'next/link';

// 子頁共用頁首:返回 Dashboard + 標題。
export function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/liff" className="text-sm text-brand-primary">
        ‹ 返回
      </Link>
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
    </div>
  );
}
