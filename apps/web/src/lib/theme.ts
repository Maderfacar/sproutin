// per-school 主題模板（Phase 8）。每個主題是一組「暖色中性」CSS 變數 bundle;
// 品牌色（--brand-*）仍由該校 primaryColor/secondaryColor 疊上（BrandingProvider 設定）。
// 新增主題＝在此加一組 + 後端 theme 允許值。

export type ThemeVars = Record<string, string>;

const WARM: ThemeVars = {
  '--bg': '#faf6ef',
  '--bg-deep': '#f1e8da',
  '--surface': '#ffffff',
  '--ink': '#40382f',
  '--ink-soft': '#8c8175',
  '--line': '#ece2d3',
  '--radius-card': '22px',
  '--radius-md': '14px',
  '--shadow-soft': '0 1px 2px rgba(94, 68, 40, 0.05), 0 10px 26px rgba(94, 68, 40, 0.07)',
  '--shadow-lift': '0 10px 28px rgba(94, 68, 40, 0.16)',
};

const PROFESSIONAL: ThemeVars = {
  '--bg': '#f4f6f8',
  '--bg-deep': '#e8edf1',
  '--surface': '#ffffff',
  '--ink': '#1f2933',
  '--ink-soft': '#66707b',
  '--line': '#e2e6ea',
  '--radius-card': '12px',
  '--radius-md': '8px',
  '--shadow-soft': '0 1px 2px rgba(30, 41, 51, 0.05), 0 8px 20px rgba(30, 41, 51, 0.06)',
  '--shadow-lift': '0 8px 22px rgba(30, 41, 51, 0.14)',
};

export const THEMES: Record<string, ThemeVars> = {
  warm: WARM,
  professional: PROFESSIONAL,
};

export function themeVars(theme: string): ThemeVars {
  return THEMES[theme] ?? WARM;
}
