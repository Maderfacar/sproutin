'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import { surfaceOf, toSurfaceHref } from '../lib/surface';

type SurfaceLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

// 共用元件裡的連結一律用這個（一般頁面用 next/link 即可）。
// `href` 寫手機版網址，實際連到哪裡由目前所在的外框決定 —— 在桌面後台按下去就留在桌面後台。
export function SurfaceLink({ href, ...rest }: SurfaceLinkProps) {
  const pathname = usePathname();
  return <Link href={toSurfaceHref(href, surfaceOf(pathname))} {...rest} />;
}
