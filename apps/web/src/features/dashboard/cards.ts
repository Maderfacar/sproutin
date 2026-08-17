// Dashboard 卡片的 UI 呈現資料（標題/說明/圖示/連結）。卡片「是否顯示」由
// shared 的 selectDashboardCards 依角色 + featureFlags + cardOrder 決定；此處只負責外觀。
// enabled=false 表示該功能尚未完工 → 標示「即將推出」，並連到 /liff/soon/<id> 預告頁
// （產品原則：未完工也要讓人知道接下來會有這功能，Human Owner 2026-08-17）。

import type { IconName } from '../../components/Icon';

export interface DashboardCardMeta {
  title: string;
  description: string;
  icon: IconName;
  href?: string;
  enabled: boolean;
}

export const CARD_META: Record<string, DashboardCardMeta> = {
  announcement: { title: '公告', description: '學校與班級公告', icon: 'mega', href: '/liff/announcement', enabled: true },
  attendance: { title: '出缺勤', description: '查看每日出席狀況', icon: 'cal', href: '/liff/attendance', enabled: true },
  leave: { title: '請假', description: '申請與查詢請假', icon: 'doc', href: '/liff/leave', enabled: true },
  'communication-book': {
    title: '聯絡簿',
    description: '當日狀態與親師對話',
    icon: 'book',
    href: '/liff/communication-book',
    enabled: true,
  },
  // 娃娃車刀1（路線與接送點設定 + 隨車老師點名 + 家長今日狀態）已上線。
  // 刀2（預計抵達時間、明天不搭車、上車推播）尚未完工。
  transportation: {
    title: '娃娃車',
    description: '今日乘車狀態',
    icon: 'bus',
    href: '/liff/bus',
    enabled: true,
  },
  audit: { title: '稽核', description: '查詢操作紀錄', icon: 'shield', href: '/liff/audit', enabled: true },
  // --- 規劃中（連到預告頁）---
  payment: { title: '收費繳費', description: '帳單與繳費紀錄', icon: 'wallet', href: '/liff/soon/payment', enabled: false },
  portfolio: {
    title: '成長紀錄',
    description: '作品、照片與觀察',
    icon: 'cam',
    href: '/liff/soon/portfolio',
    enabled: false,
  },
  forms: { title: '表單文件', description: '同意書與報名表', icon: 'doc', href: '/liff/soon/forms', enabled: false },
  calendar: { title: '行事曆', description: '活動與重要日期', icon: 'cal', href: '/liff/soon/calendar', enabled: false },
  health: { title: '幼兒健康', description: '過敏與用藥委託', icon: 'heart', href: '/liff/soon/health', enabled: false },
};

export function cardMeta(id: string): DashboardCardMeta {
  return CARD_META[id] ?? { title: id, description: '', icon: 'doc', enabled: false };
}
