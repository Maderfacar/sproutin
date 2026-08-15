// Day-key 正規化（UTC 午夜）。
//
// Attendance @@unique([studentId, date]) 以「每日一列」為前提;投影（LeaveApproved）與
// 手動標記必須把 date 正規化到**同一 key**，override 感知（ADR-002）才成立——否則
// 投影列與手動列會落在不同時刻、不撞 unique，衝突判斷失效。
//
// 現有慣例（packages/db/prisma/seed.ts）= UTC 午夜（例 2026-08-10T00:00:00.000Z）。
// 本 helper 對齊該慣例。時區升級成 Asia/Taipei 本地日界屬未來調整，須一致套用兩端。

const MS_PER_DAY = 86_400_000;

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
