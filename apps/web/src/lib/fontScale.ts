// 全站字體大小（Human Owner 2026-08-18 定案：存在這支瀏覽器上、只在家長手機端提供開關）。
//
// 作法是改 `html` 的 font-size，不是逐一調整每個 `text-*`：
// Tailwind 的字級與間距全部是 rem，所以整頁會**等比**放大 —— 卡片、留白、圖示、
// 行高一起長大，版面比例天然不會跑掉，也不會出現「字變大但格子沒變大」的擠壓。
//
// 用 % 而不是 px：% 是相對於瀏覽器本身的預設字級，所以已經在系統設定裡放大過字的人
// 不會被我們硬壓回 16px。
export type FontScale = 'base' | 'medium' | 'large';

export const FONT_SCALE_STORAGE_KEY = 'sproutin.fontScale';

export const FONT_SCALE_OPTIONS: { id: FontScale; label: string; hint: string; percent: number }[] = [
  { id: 'base', label: '標準', hint: '目前的大小', percent: 100 },
  { id: 'medium', label: '中', hint: '放大一些', percent: 112.5 },
  { id: 'large', label: '大', hint: '長輩也看得清楚', percent: 125 },
];

const DEFAULT_SCALE: FontScale = 'base';

export function isFontScale(value: unknown): value is FontScale {
  return FONT_SCALE_OPTIONS.some((o) => o.id === value);
}

export function percentFor(scale: FontScale): number {
  return FONT_SCALE_OPTIONS.find((o) => o.id === scale)?.percent ?? 100;
}

// 只有非預設值才寫進 style —— 預設值留空，讓 html 用瀏覽器原本的字級。
function cssValueFor(scale: FontScale): string {
  return scale === DEFAULT_SCALE ? '' : `${percentFor(scale)}%`;
}

/** 讀目前設定。讀不到（沒設過 / 瀏覽器不給存）一律回預設。 */
export function readFontScale(): FontScale {
  if (typeof window === 'undefined') return DEFAULT_SCALE;
  try {
    const raw = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    return isFontScale(raw) ? raw : DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
}

/**
 * 立刻套用並記住。
 * 回傳「有沒有記住」—— 無痕模式或關掉儲存的瀏覽器會存不進去，這時候這一次仍然生效，
 * 但重開就會回到標準。呼叫端要把這件事講出來，不要假裝有記住（見 FontScaleControl）。
 */
export function applyFontScale(scale: FontScale): boolean {
  if (typeof document === 'undefined') return false;
  document.documentElement.style.fontSize = cssValueFor(scale);
  try {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, scale);
    return true;
  } catch {
    return false;
  }
}

// 首次繪製之前就要套上，否則會先閃一下標準字再跳大。
// 放在 <body> 的第一個子節點同步執行 —— 此時後面的內容都還沒被解析出來。
// 由上面的常數推導，避免對照表在兩個地方各寫一次而走鐘。
export const FONT_SCALE_BOOT_SCRIPT = `try{var m=${JSON.stringify(
  Object.fromEntries(
    FONT_SCALE_OPTIONS.filter((o) => o.id !== DEFAULT_SCALE).map((o) => [o.id, `${o.percent}%`]),
  ),
)};var v=m[localStorage.getItem(${JSON.stringify(
  FONT_SCALE_STORAGE_KEY,
)})];if(v){document.documentElement.style.fontSize=v}}catch(e){}`;
