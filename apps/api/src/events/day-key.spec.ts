import { dayKey, enumerateDays, todayKey } from './day-key';

describe('dayKey', () => {
  it('把任意時刻正規化為當日 UTC 午夜', () => {
    expect(dayKey(new Date('2026-08-10T13:45:12.000Z')).toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('已是 UTC 午夜 → 不變', () => {
    expect(dayKey(new Date('2026-08-10T00:00:00.000Z')).toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });
});

describe('enumerateDays', () => {
  it('單日（from==to）→ 一個 key', () => {
    const days = enumerateDays(new Date('2026-08-10T00:00:00.000Z'), new Date('2026-08-10T00:00:00.000Z'));
    expect(days.map((d) => d.toISOString())).toEqual(['2026-08-10T00:00:00.000Z']);
  });

  it('多日（含端點）→ 逐日 UTC 午夜', () => {
    const days = enumerateDays(new Date('2026-08-10T08:00:00.000Z'), new Date('2026-08-12T20:00:00.000Z'));
    expect(days.map((d) => d.toISOString())).toEqual([
      '2026-08-10T00:00:00.000Z',
      '2026-08-11T00:00:00.000Z',
      '2026-08-12T00:00:00.000Z',
    ]);
  });

  it('from > to → 空陣列（防呆）', () => {
    expect(enumerateDays(new Date('2026-08-12T00:00:00.000Z'), new Date('2026-08-10T00:00:00.000Z'))).toEqual([]);
  });
});

// Human Owner 2026-08-19：「系統的時間與台灣時間不符」。
// 台灣是 UTC+8 —— 凌晨 0 點到早上 8 點之間，UTC 還停在昨天。
// 老師七點到園填聯絡簿時，「不能填未來」的檢查會把今天當成明天而擋下來。
describe('todayKey（台灣的今天）', () => {
  it('台灣清晨 → 已經是新的一天', () => {
    expect(todayKey(new Date('2026-08-18T23:00:00.000Z')).toISOString()).toBe(
      '2026-08-19T00:00:00.000Z',
    );
  });

  it('台灣白天 → 當天', () => {
    expect(todayKey(new Date('2026-08-19T04:00:00.000Z')).toISOString()).toBe(
      '2026-08-19T00:00:00.000Z',
    );
  });

  it('台灣深夜 → 還是當天，不會提早跳到明天', () => {
    expect(todayKey(new Date('2026-08-19T15:59:00.000Z')).toISOString()).toBe(
      '2026-08-19T00:00:00.000Z',
    );
  });

  // 儲存慣例沒有改：key 仍然是該日曆日的 UTC 午夜，只是「哪一天」改用台灣的日曆。
  it('回傳的仍是 UTC 午夜（與 dayKey 同一種 key）', () => {
    const key = todayKey(new Date('2026-08-18T23:00:00.000Z'));
    expect(key.toISOString().endsWith('T00:00:00.000Z')).toBe(true);
    expect(dayKey(key).toISOString()).toBe(key.toISOString());
  });
});
