'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import {
  MOBILE_HOME,
  readBackTarget,
  rememberBackTarget,
  resolveBackHref,
} from '../lib/backTarget';

// 子頁共用頁首：返回 + 襯線標題（清葉）。
// 返回目標預設是手機版首頁；若這一頁是從桌面後台點進來的（?from=admin），則回後台
// —— 否則使用者會被丟到手機版首頁，等於中途換了一個 App（見 lib/backTarget）。
export function PageHeader({ title }: { title: string }) {
  const [backHref, setBackHref] = useState(MOBILE_HOME);

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get('from');
    rememberBackTarget(from);
    setBackHref(resolveBackHref(from, readBackTarget()));
  }, []);

  return (
    <div className="rise-in mb-1 flex items-center gap-3">
      <Link
        href={backHref}
        aria-label="返回"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-brand-primary hover:text-brand-primary"
      >
        <Icon name="chev" className="h-4 w-4 rotate-180" />
      </Link>
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">{title}</h1>
    </div>
  );
}
