import type { IconName } from '../../components/Icon';

// 圖文選單的版面與目的地。與 api 端的 rich-menu.types.ts 對應
// （api 不從 shared 匯入執行期的值，因此兩邊各有一份;欄位若要增減需同步改動）。

export type RichMenuAudience = 'PARENT' | 'STAFF' | 'UNBOUND';
export type RichMenuTemplate = 'SIX' | 'FOUR' | 'TWO';
export type RichMenuTarget =
  | 'home'
  | 'communication-book'
  | 'leave'
  | 'attendance'
  | 'announcement'
  | 'notification'
  | 'bus'
  | 'me';

export interface RichMenuItem {
  index: number;
  target: RichMenuTarget;
}

export interface RichMenuConfigView {
  audience: RichMenuAudience;
  template: RichMenuTemplate;
  imageUrl: string | null;
  chatBarText: string;
  items: RichMenuItem[];
  appliedAt: string | null;
  isApplied: boolean;
}

export interface SaveRichMenuBody {
  template: RichMenuTemplate;
  imageUrl: string | null;
  chatBarText: string;
  items: RichMenuItem[];
}

export interface ApplyResult {
  audience: RichMenuAudience;
  linkedUsers: number;
  skippedUsers: number;
  appliedAt: string;
}

export const AUDIENCE_LABEL: Record<RichMenuAudience, string> = {
  PARENT: '家長',
  STAFF: '老師與行政',
  UNBOUND: '還沒綁定的人',
};

export const AUDIENCE_HINT: Record<RichMenuAudience, string> = {
  PARENT: '已完成綁定的家長與監護人看到的選單。',
  STAFF: '園長、行政、老師看到的選單。',
  UNBOUND: '還沒綁定的人看到的選單。他們還沒有身分，所以只給一個入口把他們帶去綁定。',
};

// 每個版面的格數（幾何座標由後端計算，前端只需要知道格數與排法來畫預覽）。
export const TEMPLATE_SHAPE: Record<RichMenuTemplate, { cols: number; rows: number; label: string }> =
  {
    SIX: { cols: 3, rows: 2, label: '六格' },
    FOUR: { cols: 2, rows: 2, label: '四格' },
    TWO: { cols: 2, rows: 1, label: '兩格' },
  };

export function cellCount(template: RichMenuTemplate): number {
  const shape = TEMPLATE_SHAPE[template];
  return shape.cols * shape.rows;
}

export const TARGET_LABEL: Record<RichMenuTarget, string> = {
  home: '首頁',
  'communication-book': '聯絡簿',
  leave: '請假',
  attendance: '出缺勤',
  announcement: '公告',
  notification: '通知',
  bus: '娃娃車點名',
  me: '我的',
};

export const TARGET_ICON: Record<RichMenuTarget, IconName> = {
  home: 'home',
  'communication-book': 'book',
  leave: 'cal',
  attendance: 'check',
  announcement: 'mega',
  notification: 'bell',
  bus: 'bus',
  me: 'user',
};

export const TARGET_VALUES = Object.keys(TARGET_LABEL) as RichMenuTarget[];

// 只有教職員能用的目的地（與 api 的 STAFF_ONLY_TARGETS 對應）。
// 娃娃車**點名**是隨車老師在車上用的頁面，家長按下去只會撞到權限牆；
// 家長要看的今日搭車狀態本來就在首頁的卡片上，不需要另一個入口。
const STAFF_ONLY_TARGETS: RichMenuTarget[] = ['bus'];

export function targetsFor(audience: RichMenuAudience): RichMenuTarget[] {
  if (audience === 'STAFF') {
    return TARGET_VALUES;
  }
  return TARGET_VALUES.filter((t) => !STAFF_ONLY_TARGETS.includes(t));
}

// LINE 的限制（查證自官方 API reference，2026-08-17）。前端先擋，後端再擋一次。
export const CHAT_BAR_TEXT_MAX = 14;
