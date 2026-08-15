'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { PublicConfig } from '@sproutin/shared';

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
    root.style.setProperty('--brand-primary', config.primaryColor);
    root.style.setProperty('--brand-secondary', config.secondaryColor);
  }, [config.primaryColor, config.secondaryColor]);

  return <BrandingContext.Provider value={config}>{children}</BrandingContext.Provider>;
}
