import { dayKey, enumerateDays } from './day-key';

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
