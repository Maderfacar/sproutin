// 圖文選單的版面與可連結的目的地。
//
// 這些常數刻意留在 api 內（不放 @sproutin/shared）：api 不從 shared 匯入執行期的值
// —— jest 解析不到 shared 的 .js 路徑（既有慣例）。web 端有一份對應的定義供預覽使用。

export type RichMenuTemplateName = 'SIX' | 'FOUR' | 'TWO';

export interface Cell {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateSpec {
  width: number;
  height: number;
  cells: Cell[];
}

// LINE 的限制：寬 800–2500、高 ≥250、寬/高 ≥1.45、最多 20 格。
// 2500×1686 → 比例 1.48 ✔；2500×843 → 2.97 ✔。格數最多 6，遠低於 20。
function grid(width: number, height: number, cols: number, rows: number): TemplateSpec {
  const cellW = Math.floor(width / cols);
  const cellH = Math.floor(height / rows);
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({ x: c * cellW, y: r * cellH, width: cellW, height: cellH });
    }
  }
  return { width, height, cells };
}

export const TEMPLATES: Record<RichMenuTemplateName, TemplateSpec> = {
  SIX: grid(2500, 1686, 3, 2),
  FOUR: grid(2500, 1686, 2, 2),
  TWO: grid(2500, 843, 2, 1),
};

// 一格可以連到的目的地。值即 LIFF 附加路徑（LIFF URL 支援 https://liff.line.me/{liffId}/{path}，
// 由 SDK 以 liff.state 轉址到 Endpoint URL + 該路徑）。
export const TARGET_PATHS = {
  home: '',
  'communication-book': 'communication-book',
  leave: 'leave',
  attendance: 'attendance',
  announcement: 'announcement',
  notification: 'notification',
  me: 'me',
} as const;

export type RichMenuTarget = keyof typeof TARGET_PATHS;

export const TARGET_VALUES = Object.keys(TARGET_PATHS) as RichMenuTarget[];

export interface RichMenuItem {
  index: number; // 對應 TEMPLATES[template].cells 的索引
  target: RichMenuTarget;
}

export type RichMenuAudienceName = 'PARENT' | 'STAFF' | 'UNBOUND';

export const AUDIENCE_VALUES: RichMenuAudienceName[] = ['PARENT', 'STAFF', 'UNBOUND'];

// 還沒綁定的人一律只給一顆「開始使用」—— 他們還沒有身分，任何功能頁都只會把他們踢回綁定畫面。
// 因此 UNBOUND 固定用兩格版面的第一格連首頁（首頁會自動導向綁定）。
export const UNBOUND_DEFAULT_ITEMS: RichMenuItem[] = [{ index: 0, target: 'home' }];
