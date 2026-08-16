// per-school 主題模板。目前定案：先做一套「清葉」做到頂（單一主題）;
// 品牌色（--brand-*）仍由該校 primaryColor/secondaryColor 疊上（BrandingProvider 設定）。
// 未來要加第二套主題供園所選 → 在此加一組 + 後端 theme 允許值（架構已預留）。

export type ThemeVars = Record<string, string>;

// 清葉（清新自然）：與 globals.css :root 對齊，避免載入時閃爍。
const QINGYE: ThemeVars = {
  '--bg': '#f4f2ea',
  '--bg-deep': '#eeebe0',
  '--surface': '#fbfaf4',
  '--ink': '#23302a',
  '--ink-soft': '#8a9188',
  '--line': '#e1e0d2',
  '--radius-card': '18px',
  '--radius-md': '12px',
  '--shadow-soft': '0 1px 2px rgba(35, 48, 42, 0.04), 0 14px 34px -22px rgba(35, 48, 42, 0.22)',
  '--shadow-lift': '0 16px 34px -18px rgba(35, 48, 42, 0.28)',
};

// 單一主題：現有各校 SchoolConfig.theme（warm/professional）一律映射到清葉，
// 直到未來正式推出多主題選擇。
export const THEMES: Record<string, ThemeVars> = {
  qingye: QINGYE,
  warm: QINGYE,
  professional: QINGYE,
};

export function themeVars(theme: string): ThemeVars {
  return THEMES[theme] ?? QINGYE;
}
