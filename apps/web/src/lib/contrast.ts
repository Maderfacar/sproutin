// 色彩對比（WCAG 2.1 相對亮度）。**只給測試用**，執行期不會載到這裡。
//
// 為什麼要自己算而不是裝一個套件：要檢查的是 globals.css 裡那份 token，
// 而那份 token 用了 var() 與 color-mix() —— 現成的對比工具吃的是最終色碼，
// 中間那層解析本來就得自己做。既然要解析，順手把公式一起寫了比多一個相依乾淨。

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function parseHex(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const raw = m[1]!;
  const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

// color-mix(in srgb, A p%, B)。兩個顏色都不透明時就是逐通道的線性內插。
export function mix(a: Rgb, b: Rgb, aPercent: number): Rgb {
  const w = aPercent / 100;
  return {
    r: clamp255(a.r * w + b.r * (1 - w)),
    g: clamp255(a.g * w + b.g * (1 - w)),
    b: clamp255(a.b * w + b.b * (1 - w)),
  };
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(c: Rgb): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG 對比值，1（完全沒差）到 21（黑白）。 */
export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * 從 globals.css 的一段文字裡解出 CSS 變數，並把 var() 與 color-mix() 展開成實際顏色。
 *
 * 只支援我們自己會寫的那幾種形式（hex / var() / 一層 color-mix）——
 * 這是給測試讀我們自己的檔案用的，不是通用的 CSS 解析器。
 * 解不出來的（rgba() 那些半透明疊層）回傳 null，由呼叫端決定要不要管。
 */
export function resolveTokens(css: string): Map<string, Rgb | null> {
  const raw = new Map<string, string>();
  const declaration = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = declaration.exec(css)) !== null) {
    // 後面的宣告蓋掉前面的，與 CSS 同一個規則（深色區塊寫在淺色之後）。
    raw.set(m[1]!, m[2]!.trim());
  }

  const resolved = new Map<string, Rgb | null>();
  const resolve = (name: string, seen: Set<string>): Rgb | null => {
    if (resolved.has(name)) return resolved.get(name) ?? null;
    if (seen.has(name)) return null; // 循環參照
    seen.add(name);
    const value = raw.get(name);
    const out = value === undefined ? null : resolveValue(value, seen);
    resolved.set(name, out);
    return out;
  };

  const resolveValue = (value: string, seen: Set<string>): Rgb | null => {
    const hex = parseHex(value);
    if (hex) return hex;

    const varMatch = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(value);
    if (varMatch) return resolve(varMatch[1]!, seen);

    const mixMatch = /^color-mix\(\s*in srgb\s*,\s*(.+?)\s+(\d+(?:\.\d+)?)%\s*,\s*(.+?)\s*\)$/i.exec(
      value,
    );
    if (mixMatch) {
      const a = resolveValue(mixMatch[1]!.trim(), seen);
      const b = resolveValue(mixMatch[3]!.trim(), seen);
      if (!a || !b) return null;
      return mix(a, b, Number(mixMatch[2]));
    }

    if (value.toLowerCase() === 'white') return { r: 255, g: 255, b: 255 };
    if (value.toLowerCase() === 'black') return { r: 0, g: 0, b: 0 };
    return null;
  };

  for (const name of raw.keys()) {
    resolve(name, new Set());
  }
  return resolved;
}
