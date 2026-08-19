// per-school 主題模板。目前定案：先做一套「清葉」做到頂（單一主題）;
// 品牌色（--brand-*）仍由該校 primaryColor/secondaryColor 疊上（BrandingProvider 設定）。
// 未來要加第二套主題供園所選 → 在此加一組 + 後端 theme 允許值（架構已預留）。
//
// **這裡刻意不再回傳任何 CSS 變數（2026-08-20）。**
//
// 原本每一套主題都帶一份中性色的副本，由 BrandingProvider 在 runtime 用 inline style
// 寫到 <html> 上。inline style 贏過 :root，於是那份副本才是真正生效的值 ——
// 而它停在「清葉加厚」之前：--ink-soft 還是 #8a9188（加厚時已加深成 #6e7770，
// 理由正是「長輩在戶外看得見才算數」）、--radius-card 還是 18px。
// 也就是說 globals.css 改了半天，跑起來的其實是舊的。
//
// 同一個機制也讓深色模式做不起來：inline style 一樣贏過
// @media (prefers-color-scheme: dark)，整份深色 token 會被靜靜蓋掉。
//
// 所以主題改成只給一個名字（掛在 <html data-theme>），**顏色一律由 CSS 決定**。
// 加第二套主題時是在 globals.css 加一段 :root[data-theme='xxx']，
// 淺色與深色各定義一次 —— 而不是再複製一份值到 JS 裡。

export type ThemeName = 'qingye';

// 現有各校 SchoolConfig.theme（warm/professional）一律映射到清葉，
// 直到未來正式推出多主題選擇。
const ALIASES: Record<string, ThemeName> = {
  qingye: 'qingye',
  warm: 'qingye',
  professional: 'qingye',
};

export function themeName(theme: string): ThemeName {
  return ALIASES[theme] ?? 'qingye';
}
