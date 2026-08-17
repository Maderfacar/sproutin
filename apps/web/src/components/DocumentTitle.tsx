'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useBranding } from '../lib/branding';
import { documentTitleFor } from '../lib/pageTitle';

// 把瀏覽器分頁的標題設成「頁名 · 園名」。
//
// **為什麼不用 Next 的 metadata**：園名是 runtime 才拿得到的（ADR-001，每園不同），
// 而全站頁面都是 client component，export metadata 用不了。
// 掛在 BrandingProvider 底下一次，涵蓋該外框內的所有頁面。
export function DocumentTitle() {
  const pathname = usePathname();
  const branding = useBranding();

  useEffect(() => {
    document.title = documentTitleFor(pathname, branding.brandName);
  }, [pathname, branding.brandName]);

  return null;
}
