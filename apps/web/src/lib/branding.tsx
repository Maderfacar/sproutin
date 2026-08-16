'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { PublicConfig } from '@sproutin/shared';
import { THEMES, themeVars } from './theme';

// 園方品牌（ADR-001，runtime 套用；bundle 不含 per-school 值）。
// primaryColor/secondaryColor → CSS 變數（Tailwind 以 var() 引用）；brandName/logo/banner 供 AppShell。
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
    // 預覽覆蓋（?theme=）：只影響當次瀏覽,不動資料。用於對比不同主題。
    const previewTheme = new URLSearchParams(window.location.search).get('theme');
    const effectiveTheme = previewTheme && THEMES[previewTheme] ? previewTheme : config.theme;
    // 主題模板（per-school）：套一組暖色中性變數。
    const vars = themeVars(effectiveTheme);
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    // 品牌色（per-school）疊上主題之上。
    root.style.setProperty('--brand-primary', config.primaryColor);
    root.style.setProperty('--brand-secondary', config.secondaryColor);
  }, [config.theme, config.primaryColor, config.secondaryColor]);

  return <BrandingContext.Provider value={config}>{children}</BrandingContext.Provider>;
}
