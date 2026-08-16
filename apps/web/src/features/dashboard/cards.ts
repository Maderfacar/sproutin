// Dashboard 卡片的 UI 呈現資料（標題/說明/圖示/連結）。卡片「是否顯示」由
// shared 的 selectDashboardCards 依角色 + featureFlags + cardOrder 決定；此處只負責外觀。
// enabled=false 表示該功能頁面本階段（Step 7a）尚未實作 → 顯示「即將推出」。

export interface DashboardCardMeta {
  title: string;
  description: string;
  icon: string;
  href?: string;
  enabled: boolean;
}

export const CARD_META: Record<string, DashboardCardMeta> = {
  announcement: { title: '公告', description: '學校與班級公告', icon: '📢', href: '/liff/announcement', enabled: true },
  attendance: { title: '出缺勤', description: '查看每日出席狀況', icon: '📅', href: '/liff/attendance', enabled: true },
  leave: { title: '請假', description: '申請與查詢請假', icon: '📝', href: '/liff/leave', enabled: true },
  message: { title: '訊息', description: '與老師/家長溝通', icon: '💬', href: '/liff/message', enabled: true },
  'communication-book': { title: '聯絡簿', description: '每日聯絡事項', icon: '📓', enabled: false },
  transportation: { title: '接送', description: '乘車與路線', icon: '🚌', enabled: false },
};

export function cardMeta(id: string): DashboardCardMeta {
  return CARD_META[id] ?? { title: id, description: '', icon: '▫️', enabled: false };
}
