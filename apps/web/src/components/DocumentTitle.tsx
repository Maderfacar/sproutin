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

// 分頁標題（給**拿不到園名**的頁面用）：根路徑、找不到頁面、錯誤頁都不在 BrandingProvider
// 底下（見那三頁的說明），所以標題由呼叫端自己給一句寫死的。
// 沒有這一支的話，這幾頁的分頁會停在 RootLayout 那個靜態的「Sproutin」，
// 開了五個分頁就分不出哪個是哪個 —— 那正是當初做 pageTitle 要解決的事。
export function StaticDocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
