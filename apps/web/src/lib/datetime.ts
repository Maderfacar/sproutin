// 全站的時間顯示（Human Owner 2026-08-19：「系統的時間與台灣時間不符」）。
//
// 兩個病灶：
//   ① 「今天」是用 `new Date().toISOString().slice(0, 10)` 算的 —— 那是 **UTC 的今天**。
//      台灣是 UTC+8，所以凌晨 0 點到早上 8 點之間，系統認定的今天是**昨天**。
//      老師七點到園要點名、填聯絡簿，正好落在這個區間。
//   ② 時間戳是把 ISO 字串直接切出來顯示（`createdAt.slice(11, 16)`）—— 那是 UTC 的時鐘，
//      畫面上會比台灣時間慢 8 小時。稽核紀錄與親師對話都中招。
//
// 解法：時間一律以**園所所在時區**呈現，不看使用者裝置的時區設定。
// 園所在台灣，孩子的「今天」就是台灣的今天 —— 家長出國旅遊時看到的也該是園所的日子，
// 而不是他人在的那一國的日子。
//
// **儲存慣例不變**：日期型欄位（出缺勤/請假/聯絡簿）仍然存成「該日曆日的 UTC 午夜」
// （見 api 的 events/day-key.ts）。這裡改的是「現在是哪一個日曆日」與「時間怎麼顯示」，
// 不是改資料庫裡那把 key —— 那會動到既有資料的語意，不在這次範圍。
export const SCHOOL_TIME_ZONE = 'Asia/Taipei';

type DateLike = Date | string | number;

interface SchoolParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number; // 0–23
  minute: number;
}

// Intl.DateTimeFormat 建構成本不低，而清單一次會格式化幾十筆 —— 建一次重複用。
let formatter: Intl.DateTimeFormat | undefined;

function partsFormatter(): Intl.DateTimeFormat {
  formatter ??= new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatter;
}

function toDate(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value);
}

/** 把任意時刻換算成園所時區的年月日時分。日期無效時回 null（呼叫端自己決定顯示什麼）。 */
export function schoolPartsOf(value: DateLike): SchoolParts | null {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = partsFormatter().formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);

  const result = {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
  };
  return Number.isNaN(result.year) ? null : result;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** 園所時區的今天，`YYYY-MM-DD`。所有「預設日期」都該用這個，不要用 toISOString。 */
export function schoolToday(now: DateLike = new Date()): string {
  return formatDate(now);
}

/** 園所時區的當月，`YYYY-MM`。 */
export function schoolMonth(now: DateLike = new Date()): string {
  return schoolToday(now).slice(0, 7);
}

/** 園所時區的「現在幾點」（0–23）。用來決定問候語、上午/下午哪一段排前面。 */
export function schoolHour(now: DateLike = new Date()): number {
  return schoolPartsOf(now)?.hour ?? 0;
}

/** `YYYY-MM-DD`。 */
export function formatDate(value: DateLike): string {
  const p = schoolPartsOf(value);
  return p ? `${p.year}-${pad(p.month)}-${pad(p.day)}` : '';
}

/** `M/D` —— 空間小的時候用（清單、摘要）。 */
export function formatMonthDay(value: DateLike): string {
  const p = schoolPartsOf(value);
  return p ? `${p.month}/${p.day}` : '';
}

/** `HH:mm`。 */
export function formatTime(value: DateLike): string {
  const p = schoolPartsOf(value);
  return p ? `${pad(p.hour)}:${pad(p.minute)}` : '';
}

/** `YYYY-MM-DD HH:mm`。 */
export function formatDateTime(value: DateLike): string {
  const p = schoolPartsOf(value);
  return p ? `${formatDate(value)} ${formatTime(value)}` : '';
}

/** 星期幾（0=日）。由園所時區的日曆日推導，不受裝置時區影響。 */
export function schoolWeekday(value: DateLike): number {
  const p = schoolPartsOf(value);
  return p ? new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() : 0;
}

/** 兩個時刻在園所時區是不是同一天。 */
export function isSameSchoolDay(a: DateLike, b: DateLike): boolean {
  const left = formatDate(a);
  return left !== '' && left === formatDate(b);
}

/**
 * 園所時區的某一天 → 後端用的日期 key（該日曆日的 UTC 午夜）。
 * 日期型欄位（出缺勤 / 請假 / 聯絡簿）送出去時一律走這裡，維持既有儲存慣例。
 */
export function schoolDayKeyIso(day: string = schoolToday()): string {
  return `${day}T00:00:00.000Z`;
}
