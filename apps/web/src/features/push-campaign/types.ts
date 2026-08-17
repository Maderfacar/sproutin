// LINE 群發的版型與收件範圍。與 api 端的 push-campaign.types.ts 對應
// （api 不從 shared 匯入執行期的值，因此兩邊各有一份；欄位若要增減需同步改動）。

export type CampaignTemplate = 'EVENT' | 'PAYMENT' | 'GENERAL';
export type CampaignAudience = 'ALL_PARENTS' | 'CLASS' | 'STAFF';
export type AppPage =
  | 'home'
  | 'announcement'
  | 'notification'
  | 'communication-book'
  | 'leave'
  | 'attendance';

export interface CampaignFieldSpec {
  key: string;
  label: string;
  placeholder: string;
}

export interface CampaignTemplateSpec {
  label: string;
  hint: string;
  badge: string | null;
  fields: CampaignFieldSpec[];
}

// **欄位值一律是「顯示用文字」**：系統不解讀也不記帳（Human Owner 定案 —— 繳費提醒就是提醒，
// 不假裝自己是收費系統）。因此提示語刻意示範「9/20（六）09:30」這種人看得懂的寫法。
export const TEMPLATES: Record<CampaignTemplate, CampaignTemplateSpec> = {
  EVENT: {
    label: '活動通知',
    hint: '親子活動、園遊會、園外教學。日期與地點會排成卡片上的兩行。',
    badge: null,
    fields: [
      { key: 'eventDate', label: '日期時間', placeholder: '9 月 20 日（六）09:30' },
      { key: 'eventPlace', label: '地點', placeholder: '園區大禮堂' },
    ],
  },
  PAYMENT: {
    label: '繳費提醒',
    hint: '卡片上會標示「繳費提醒」。金額與期限都是顯示用文字，系統不會記帳也不會自動追繳。',
    badge: '繳費提醒',
    fields: [
      { key: 'amount', label: '金額（顯示用文字）', placeholder: 'NT$ 8,500' },
      { key: 'dueDate', label: '繳費期限（顯示用文字）', placeholder: '9 月 10 日前' },
    ],
  },
  GENERAL: {
    label: '一般通知',
    hint: '臨時公布、行程變更、提醒事項。只有標題與內文。',
    badge: null,
    fields: [],
  },
};

export const TEMPLATE_VALUES = Object.keys(TEMPLATES) as CampaignTemplate[];

export const AUDIENCE_LABEL: Record<CampaignAudience, string> = {
  ALL_PARENTS: '全校家長',
  CLASS: '指定班級',
  STAFF: '教職員',
};

export const AUDIENCE_HINT: Record<CampaignAudience, string> = {
  ALL_PARENTS: '全園所有家長與監護人。',
  CLASS: '該班在學學生的家長。**不含該班老師**——要通知老師請選「教職員」。',
  STAFF: '園長、行政、老師、隨車老師。',
};

export const APP_PAGE_LABEL: Record<AppPage, string> = {
  home: '首頁',
  announcement: '公告',
  notification: '通知',
  'communication-book': '聯絡簿',
  leave: '請假',
  attendance: '出缺勤',
};

export const APP_PAGE_VALUES = Object.keys(APP_PAGE_LABEL) as AppPage[];

// 與後端一致的長度上限（前端先擋，真正的邊界在後端）。
// **這些不是 LINE 公布的數字**，是我們自己訂的保守上限 —— 官方文件查不到 altText 與
// 按鈕文字的字數限制，卡片本來也不該塞長文。
export const TITLE_MAX = 60;
export const BODY_MAX = 500;
export const FIELD_VALUE_MAX = 60;
export const BUTTON_LABEL_MAX = 20;

export interface CampaignView {
  id: string;
  template: CampaignTemplate;
  audience: CampaignAudience;
  classId: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  fields: Record<string, string>;
  status: string;
  failureReason: string | null;
  recipientCount: number;
  sentCount: number;
  skippedCount: number;
  createdBy: string;
  createdAt: string;
  sentAt: string | null;
}

export interface RecipientPreview {
  willReceive: number;
  unbound: number;
}

export interface CreateCampaignBody {
  template: CampaignTemplate;
  audience: CampaignAudience;
  classId: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  fields: Record<string, string>;
  button: { label: string; page?: AppPage; url?: string } | null;
}

export const STATUS_LABEL: Record<string, string> = {
  QUEUED: '排隊中',
  SENDING: '正在送出',
  SENT: '已送出',
  FAILED: '未全部送出',
};
