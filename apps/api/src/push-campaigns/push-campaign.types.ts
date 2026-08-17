// LINE 群發的版型與收件範圍（Phase 9 階段3）。
//
// 這些常數刻意留在 api 內（不放 @sproutin/shared）：api 不從 shared 匯入執行期的值
// —— jest 解析不到 shared 的 .js 路徑（既有慣例，同 rich-menu.types.ts）。
// web 端有一份對應的定義供表單與預覽使用。

export type PushCampaignTemplateName = 'EVENT' | 'PAYMENT' | 'GENERAL';
export type PushCampaignAudienceName = 'ALL_PARENTS' | 'CLASS' | 'STAFF';

export const TEMPLATE_VALUES: PushCampaignTemplateName[] = ['EVENT', 'PAYMENT', 'GENERAL'];
export const AUDIENCE_VALUES: PushCampaignAudienceName[] = ['ALL_PARENTS', 'CLASS', 'STAFF'];

// 版型專屬的欄位。**值一律是「顯示用文字」，系統不解讀也不記帳**
// （Human Owner 定案：繳費提醒就是提醒，不假裝自己是收費系統）。
// 因此 eventDate 不是 DateTime、amount 不是數字 —— 園所寫「9/20（六）09:30」或
// 「約 8,500 元（含餐費）」都應該原樣顯示，硬要結構化只會逼出假資料。
export const TEMPLATE_FIELDS: Record<PushCampaignTemplateName, readonly string[]> = {
  EVENT: ['eventDate', 'eventPlace'],
  PAYMENT: ['amount', 'dueDate'],
  GENERAL: [],
};

// 卡片上那幾行的標籤（送進 Flex 的文字）。
export const FIELD_LABELS: Record<string, string> = {
  eventDate: '日期',
  eventPlace: '地點',
  amount: '金額',
  dueDate: '繳費期限',
};

// 版型在卡片頂端的標記（GENERAL 不加標記，避免每張卡都掛一個沒有資訊量的標籤）。
export const TEMPLATE_BADGE: Record<PushCampaignTemplateName, string | null> = {
  EVENT: null,
  PAYMENT: '繳費提醒',
  GENERAL: null,
};

// 按鈕可以連到的 App 內頁。值即 LIFF 附加路徑，與圖文選單同一組目的地
// （`https://liff.line.me/{liffId}/{path}`，由 LIFF SDK 以 liff.state 轉址）。
export const APP_PAGE_PATHS = {
  home: '',
  announcement: 'announcement',
  notification: 'notification',
  'communication-book': 'communication-book',
  leave: 'leave',
  attendance: 'attendance',
} as const;

export type AppPageName = keyof typeof APP_PAGE_PATHS;

export const APP_PAGE_VALUES = Object.keys(APP_PAGE_PATHS) as AppPageName[];

// 自訂的保守上限。**這些不是 LINE 公布的數字**（官方文件未查到 altText 與按鈕文字的字數上限），
// 而是我們自己截斷的長度 —— 無論真正的上限是多少都不會超過，且卡片本來就不該塞長文。
// 已查證的是：定義一個 bubble 的 JSON 上限 10KB、一次 push 最多 5 個訊息物件。
export const TITLE_MAX = 60;
export const BODY_MAX = 500;
export const FIELD_VALUE_MAX = 60;
export const BUTTON_LABEL_MAX = 20;
export const ALT_TEXT_MAX = 300;

export interface CampaignButton {
  label: string;
  url: string; // 已解析完成的最終網址（App 內頁的 LIFF 連結，或園所自填的外部網址）
}

export interface CampaignContent {
  template: PushCampaignTemplateName;
  title: string;
  body: string;
  imageUrl: string | null;
  fields: Record<string, string>;
  button: CampaignButton | null;
}

// 截斷到上限並補省略號。**寧可少幾個字，不要讓 LINE 整則拒絕。**
export function clamp(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}
