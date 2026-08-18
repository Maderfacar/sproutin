import type { Prisma } from '@sproutin/db';

// 訊息中心（Human Owner 2026-08-18 定案：把「通知」頁升級成訊息中心，不做四合一）。
//
// 通知本體只存 type + payload（一串 id），所以清單上原本只看得到「有新公告」這種
// 分類名稱 —— 看不出是哪一則公告、關於哪個孩子。這裡在**讀取時**把人看得懂的字補上。
//
// 兩個刻意的選擇：
// 1. 姓名與標題是**讀取時 join**，不寫回 Notification.payload —— 與稽核紀錄的
//    actorName 同一個原則（不把 PII 複製到別的資料表）。
// 2. 只補「文字」，**不補網址**。點進去該去哪一頁是前端的路由問題，
//    後端不該知道 `/liff/...` 長什麼樣（見 web 的 features/notification/target.ts）。

export interface NotificationSummary {
  title: string;
  subtitle: string;
}

/** payload 是 Json，取值一律先確認是字串，壞資料不該讓整份清單掛掉。 */
function str(payload: Prisma.JsonValue, key: string): string | null {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

/** 這一批通知裡，某個 payload 欄位出現過的所有 id（去重、去空）。 */
export function collectIds(
  notifications: { payload: Prisma.JsonValue }[],
  key: string,
): string[] {
  const ids = new Set<string>();
  for (const n of notifications) {
    const id = str(n.payload, key);
    if (id) ids.add(id);
  }
  return [...ids];
}

export interface SummaryLookups {
  studentNames: Map<string, string>;
  announcementTitles: Map<string, { title: string; schoolWide: boolean }>;
  messageBodies: Map<string, string>;
  userNames: Map<string, string>;
}

// 日期只留 MM/DD —— 收件匣一行放不下完整年月日，年份在這個情境幾乎不會有歧義。
function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function dateRange(payload: Prisma.JsonValue): string {
  const from = shortDate(str(payload, 'dateFrom'));
  const to = shortDate(str(payload, 'dateTo'));
  if (!from) return '';
  return to && to !== from ? `${from}–${to} ` : `${from} `;
}

// 留言太長會把整行撐爆，收件匣只給一句。
const EXCERPT_MAX = 24;
function excerpt(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > EXCERPT_MAX ? `${oneLine.slice(0, EXCERPT_MAX)}…` : oneLine;
}

// 分類名稱：補不出細節時（資料被刪、payload 缺欄位）至少還講得出這是什麼。
const FALLBACK_TITLE: Record<string, string> = {
  LeaveSubmitted: '收到請假申請',
  LeaveApproved: '請假已核准',
  LeaveRejected: '請假已駁回',
  LeaveCancelled: '請假已取消',
  MessageSent: '收到新訊息',
  AnnouncementPublished: '有新公告',
  CommunicationBookPublished: '今日聯絡簿已送出',
  AttendanceMarked: '出缺勤已更新',
  'attendance.override_conflict': '出缺勤與請假衝突，請確認',
};

const SUBTITLE: Record<string, string> = {
  LeaveSubmitted: '請假申請',
  LeaveApproved: '請假',
  LeaveRejected: '請假',
  LeaveCancelled: '請假',
  MessageSent: '聯絡簿留言',
  AnnouncementPublished: '公告',
  CommunicationBookPublished: '聯絡簿',
  AttendanceMarked: '出缺勤',
  'attendance.override_conflict': '出缺勤',
};

/**
 * 一則通知 → 收件匣上那一行的標題與副標。
 * 補不出來的（相關資料已被刪、payload 缺欄位）退回分類名稱，**不會回空字串**
 * —— 收件匣上出現一行空白比出現「有新公告」更糟。
 */
export function summarize(
  notification: { type: string; payload: Prisma.JsonValue },
  lookups: SummaryLookups,
): NotificationSummary {
  const { type, payload } = notification;
  const fallback = FALLBACK_TITLE[type] ?? type;
  const studentId = str(payload, 'studentId');
  const studentName = studentId ? lookups.studentNames.get(studentId) : undefined;
  const subtitleBase = SUBTITLE[type] ?? '通知';
  const subtitle = studentName ? `${subtitleBase} · ${studentName}` : subtitleBase;

  switch (type) {
    case 'AnnouncementPublished': {
      const id = str(payload, 'announcementId');
      const found = id ? lookups.announcementTitles.get(id) : undefined;
      if (!found) return { title: fallback, subtitle: subtitleBase };
      return { title: found.title, subtitle: found.schoolWide ? '全校公告' : '班級公告' };
    }
    case 'MessageSent': {
      const id = str(payload, 'messageId');
      const body = id ? lookups.messageBodies.get(id) : undefined;
      const senderId = str(payload, 'senderId');
      const sender = senderId ? lookups.userNames.get(senderId) : undefined;
      if (!body) return { title: fallback, subtitle };
      return { title: sender ? `${sender}：${excerpt(body)}` : excerpt(body), subtitle };
    }
    case 'CommunicationBookPublished': {
      const date = shortDate(str(payload, 'date'));
      const who = studentName ?? '孩子';
      return { title: date ? `${who} ${date} 的聯絡簿已送出` : `${who}的聯絡簿已送出`, subtitle };
    }
    case 'LeaveApproved':
    case 'LeaveRejected':
    case 'LeaveCancelled':
    case 'LeaveSubmitted': {
      const what = FALLBACK_TITLE[type];
      const range = dateRange(payload);
      return { title: studentName ? `${studentName} ${range}${what}` : `${range}${what}`, subtitle };
    }
    default:
      return { title: fallback, subtitle };
  }
}
