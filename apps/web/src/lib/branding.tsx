'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { PublicConfig } from '@sproutin/shared';
import { themeName } from './theme';

// 園方品牌（ADR-001，runtime 套用；bundle 不含 per-school 值）。
// primaryColor/secondaryColor → CSS 變數（Tailwind 以 var() 引用）；brandName/logo/banner 供 PersonaShell。
const BrandingContext = createContext<PublicConfig | null>(null);

export function useBranding(): PublicConfig {
  const value = useContext(BrandingContext);
  if (!value) {
    throw new Error('useBranding 必須在 BrandingProvider 內使用');
  }
  return value;
}

export function BrandingProvider({
  config,
  children,
}: {
  config: PublicConfig;
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    // 主題只給一個名字，顏色由 CSS 決定（見 lib/theme.ts 的長註解）——
    // runtime 用 inline style 寫中性色會贏過 :root 與深色模式的 media query。
    root.dataset.theme = themeName(config.theme);
    // 品牌色是真正的 per-school 資料，只能在 runtime 給。
    // **給的是 --brand-base（原始色），不是 --brand-primary** ——
    // 深色模式要拿它調出在深底上看得見的那一階（見 globals.css）。
    root.style.setProperty('--brand-base', config.primaryColor);
    root.style.setProperty('--brand-secondary', config.secondaryColor);
  }, [config.theme, config.primaryColor, config.secondaryColor]);

  return <BrandingContext.Provider value={config}>{children}</BrandingContext.Provider>;
}
