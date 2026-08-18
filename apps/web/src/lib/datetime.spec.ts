import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatMonthDay,
  formatTime,
  isSameSchoolDay,
  schoolDayKeyIso,
  schoolHour,
  schoolMonth,
  schoolToday,
} from './datetime';

// Human Owner 2026-08-19：「系統的時間與台灣時間不符」。
// 這一組測的就是那兩個病灶：UTC 的「今天」與 UTC 的時鐘。
// 每個輸入都寫死時區（Z 或 +08:00），否則在 CI（UTC）與開發機（台灣）會得到不同結果。
describe('園所時區的時間', () => {
  describe('今天是哪一天', () => {
    // 台灣 08/19 早上 7 點 = UTC 08/18 晚上 11 點。老師到園點名的時間正好落在這裡。
    it('台灣清晨算新的一天，不是 UTC 的昨天', () => {
      expect(schoolToday('2026-08-18T23:00:00.000Z')).toBe('2026-08-19');
    });

    it('台灣深夜還算當天', () => {
      expect(schoolToday('2026-08-19T15:30:00.000Z')).toBe('2026-08-19');
    });

    it('當月同樣以台灣為準', () => {
      expect(schoolMonth('2026-08-31T23:00:00.000Z')).toBe('2026-09');
    });

    it('現在幾點也是台灣的幾點', () => {
      expect(schoolHour('2026-08-18T23:00:00.000Z')).toBe(7);
      expect(schoolHour('2026-08-19T04:00:00.000Z')).toBe(12);
    });
  });

  describe('顯示', () => {
    // 稽核紀錄原本是把 ISO 字串直接切出來 → 畫面比台灣慢 8 小時。
    it('時間戳換算成台灣時間', () => {
      expect(formatTime('2026-08-19T01:15:00.000Z')).toBe('09:15');
      expect(formatDateTime('2026-08-18T23:05:00.000Z')).toBe('2026-08-19 07:05');
    });

    it('日期與月/日', () => {
      expect(formatDate('2026-08-19T01:15:00.000Z')).toBe('2026-08-19');
      expect(formatMonthDay('2026-08-19T01:15:00.000Z')).toBe('8/19');
    });

    // 出缺勤／請假／聯絡簿的日期欄位存的是「該日曆日的 UTC 午夜」。
    // 換算到台灣是當天早上 8 點 —— 仍然是同一個日曆日，所以這些欄位不會被推移。
    it('日期型欄位（UTC 午夜）不會被推成前一天', () => {
      expect(formatDate('2026-08-19T00:00:00.000Z')).toBe('2026-08-19');
      expect(formatMonthDay('2026-08-19T00:00:00.000Z')).toBe('8/19');
    });

    it('壞字串不丟例外，回空字串', () => {
      expect(formatDate('not-a-date')).toBe('');
      expect(formatTime('')).toBe('');
      expect(formatDateTime('nope')).toBe('');
    });
  });

  describe('同一天的判斷', () => {
    it('跨 UTC 午夜但台灣同一天 → 算同一天', () => {
      expect(isSameSchoolDay('2026-08-18T20:00:00.000Z', '2026-08-19T01:00:00.000Z')).toBe(true);
    });

    it('台灣跨日 → 不同天', () => {
      expect(isSameSchoolDay('2026-08-18T15:00:00.000Z', '2026-08-18T17:00:00.000Z')).toBe(false);
    });

    it('壞字串不會被當成同一天', () => {
      expect(isSameSchoolDay('nope', 'nope')).toBe(false);
    });
  });

  // 送給後端的日期 key 維持既有慣例（該日曆日的 UTC 午夜），只是「哪一天」改用台灣的。
  it('送出去的日期 key 仍是 UTC 午夜', () => {
    expect(schoolDayKeyIso('2026-08-19')).toBe('2026-08-19T00:00:00.000Z');
  });
});
