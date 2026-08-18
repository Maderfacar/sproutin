import { formatTime, isSameSchoolDay, schoolPartsOf } from '../../lib/datetime';

// 收件匣上的時間：越近的越口語，越遠的越具體。
// 「2026-08-18 09:15:03」在一行裡又長又難掃，而收件匣要的是「這是不是新的」。
//
// 「今天／昨天／幾點」一律以園所時區（台灣）判斷 —— 見 lib/datetime。
// 用裝置時區的話，同一則通知在不同人的手機上會分到不同的日子。
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** `now` 可注入，讓測試不必依賴當下時間。 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const diff = now.getTime() - then.getTime();
  // 伺服器與手機的時鐘會有幾秒誤差 → 未來時間一律當成剛剛，不要顯示「-1 分鐘前」。
  if (diff < MINUTE) return '剛剛';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分鐘前`;
  if (isSameSchoolDay(then, now)) return formatTime(then);

  if (isSameSchoolDay(then, new Date(now.getTime() - DAY))) return `昨天 ${formatTime(then)}`;

  const thenParts = schoolPartsOf(then);
  const nowParts = schoolPartsOf(now);
  if (!thenParts || !nowParts) return '';

  const md = `${thenParts.month}/${thenParts.day}`;
  return thenParts.year === nowParts.year ? md : `${thenParts.year}/${md}`;
}
