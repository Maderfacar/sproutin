// Day-key 正規化（UTC 午夜）。
//
// Attendance @@unique([studentId, date]) 以「每日一列」為前提;投影（LeaveApproved）與
// 手動標記必須把 date 正規化到**同一 key**，override 感知（ADR-002）才成立——否則
// 投影列與手動列會落在不同時刻、不撞 unique，衝突判斷失效。
//
// 現有慣例（packages/db/prisma/seed.ts）= UTC 午夜（例 2026-08-10T00:00:00.000Z）。
// 本 helper 對齊該慣例 —— **儲存的 key 不變**。
//
// 但「現在是哪一天」必須用台灣的日曆日算（Human Owner 2026-08-19 回報時間與台灣不符）：
// 台灣是 UTC+8，凌晨 0 點到早上 8 點之間，UTC 還停在昨天。老師七點到園填聯絡簿時，
// 「不能填未來」的檢查會把今天當成明天而擋下來。見 todayKey()。

const MS_PER_DAY = 86_400_000;

// 園所所在時區。孩子的「今天」是園所的今天，不是伺服器（UTC）的今天。
// 前端有一份對應的 apps/web/src/lib/datetime.ts —— 兩端要一致。
export const SCHOOL_TIME_ZONE = 'Asia/Taipei';

const schoolDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: SCHOOL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// 台灣的今天，正規化成既有慣例的 UTC 午夜 key。
// 例：台灣 2026-08-19 07:00（= UTC 2026-08-18 23:00）→ 2026-08-19T00:00:00.000Z。
export function todayKey(now: Date = new Date()): Date {
  // en-CA 的日期格式就是 YYYY-MM-DD，不必自己拼 parts。
  return new Date(`${schoolDateFormat.format(now)}T00:00:00.000Z`);
}

// 將任意時刻正規化為當日 UTC 午夜。
export function dayKey(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// 列舉 from..to（含端點）逐日 UTC 午夜。用於多日 Leave 的逐日投影。
// from > to 時回傳空陣列（防呆）。
export function enumerateDays(from: Date, to: Date): Date[] {
  const start = dayKey(from).getTime();
  const end = dayKey(to).getTime();
  const days: Date[] = [];
  for (let t = start; t <= end; t += MS_PER_DAY) {
    days.push(new Date(t));
  }
  return days;
}
