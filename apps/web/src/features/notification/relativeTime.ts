// 收件匣上的時間：越近的越口語，越遠的越具體。
// 「2026-08-18 09:15:03」在一行裡又長又難掃，而收件匣要的是「這是不是新的」。
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** `now` 可注入，讓測試不必依賴當下時間。 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const diff = now.getTime() - then.getTime();
  // 伺服器與手機的時鐘會有幾秒誤差 → 未來時間一律當成剛剛，不要顯示「-1 分鐘前」。
  if (diff < MINUTE) return '剛剛';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分鐘前`;
  if (sameDay(then, now)) return hhmm(then);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(then, yesterday)) return `昨天 ${hhmm(then)}`;

  const sameYear = then.getFullYear() === now.getFullYear();
  const md = `${then.getMonth() + 1}/${then.getDate()}`;
  return sameYear ? md : `${then.getFullYear()}/${md}`;
}
