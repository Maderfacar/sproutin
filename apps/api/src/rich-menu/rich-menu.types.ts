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

export interface TemplateShape {
  cols: number;
  rows: number;
}

// 版面只定義「切幾格」，**實際座標依底圖的真實尺寸計算**。
// 原因：LINE 要求上傳的底圖尺寸必須與選單宣告的尺寸完全一致。若寫死 2500×1686，
// 園所就得剛好湊出那個尺寸，否則被 LINE 拒絕 —— 改成看圖說話，園所上傳什麼就用什麼。
export const TEMPLATE_SHAPES: Record<RichMenuTemplateName, TemplateShape> = {
  SIX: { cols: 3, rows: 2 },
  FOUR: { cols: 2, rows: 2 },
  TWO: { cols: 2, rows: 1 },
};

export function cellCount(template: RichMenuTemplateName): number {
  const shape = TEMPLATE_SHAPES[template];
  return shape.cols * shape.rows;
}

// 依底圖實際尺寸切格。最後一欄／最後一列吃掉整除的餘數，避免右側或底部留下無法點擊的縫。
export function cellsFor(
  template: RichMenuTemplateName,
  width: number,
  height: number,
): Cell[] {
  const { cols, rows } = TEMPLATE_SHAPES[template];
  const cellW = Math.floor(width / cols);
  const cellH = Math.floor(height / rows);
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({
        x: c * cellW,
        y: r * cellH,
        width: c === cols - 1 ? width - c * cellW : cellW,
        height: r === rows - 1 ? height - r * cellH : cellH,
      });
    }
  }
  return cells;
}

// 一格可以連到的目的地。值即 LIFF 附加路徑（LIFF URL 支援 https://liff.line.me/{liffId}/{path}，
// 由 SDK 以 liff.state 轉址到 Endpoint URL + 該路徑）。
export const TARGET_PATHS = {
  home: '',
  'communication-book': 'communication-book',
  leave: 'leave',
  attendance: 'attendance',
  announcement: 'announcement',
  notification: 'notification',
  bus: 'bus',
  me: 'me',
} as const;

export type RichMenuTarget = keyof typeof TARGET_PATHS;

export const TARGET_VALUES = Object.keys(TARGET_PATHS) as RichMenuTarget[];

// 只有教職員能用的目的地。`bus` 是娃娃車**點名**頁（隨車老師在車上用），
// 家長按下去只會撞到權限牆 —— 家長要看的今日搭車狀態本來就在首頁的卡片上。
// 前端不列給家長，後端再擋一次（前端只決定顯示，授權一律在後端）。
export const STAFF_ONLY_TARGETS: RichMenuTarget[] = ['bus'];

export function isTargetAllowedFor(
  audience: RichMenuAudienceName,
  target: RichMenuTarget,
): boolean {
  return audience === 'STAFF' || !STAFF_ONLY_TARGETS.includes(target);
}

export interface RichMenuItem {
  index: number; // 對應 TEMPLATES[template].cells 的索引
  target: RichMenuTarget;
}

export type RichMenuAudienceName = 'PARENT' | 'STAFF' | 'UNBOUND';

export const AUDIENCE_VALUES: RichMenuAudienceName[] = ['PARENT', 'STAFF', 'UNBOUND'];

// 還沒綁定的人一律只給一顆「開始使用」—— 他們還沒有身分，任何功能頁都只會把他們踢回綁定畫面。
// 因此 UNBOUND 固定用兩格版面的第一格連首頁（首頁會自動導向綁定）。
export const UNBOUND_DEFAULT_ITEMS: RichMenuItem[] = [{ index: 0, target: 'home' }];
