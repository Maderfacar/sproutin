import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FONT_SCALE_BOOT_SCRIPT,
  FONT_SCALE_OPTIONS,
  FONT_SCALE_STORAGE_KEY,
  applyFontScale,
  isFontScale,
  percentFor,
  readFontScale,
} from './fontScale';

describe('fontScale', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.fontSize = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('沒設定過時回標準', () => {
    expect(readFontScale()).toBe('base');
  });

  it('讀得回存過的設定', () => {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, 'large');
    expect(readFontScale()).toBe('large');
  });

  it('存到不認得的值時退回標準，不讓壞資料流進版面', () => {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, 'gigantic');
    expect(readFontScale()).toBe('base');
  });

  it('套用時改 html 的 font-size 並記住', () => {
    expect(applyFontScale('medium')).toBe(true);
    expect(document.documentElement.style.fontSize).toBe('112.5%');
    expect(window.localStorage.getItem(FONT_SCALE_STORAGE_KEY)).toBe('medium');
  });

  it('標準值不留下 inline style，交還給瀏覽器本身的字級', () => {
    applyFontScale('large');
    applyFontScale('base');
    expect(document.documentElement.style.fontSize).toBe('');
  });

  it('瀏覽器不給存時仍然套用，但誠實回報沒記住', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(applyFontScale('large')).toBe(false);
    expect(document.documentElement.style.fontSize).toBe('125%');
  });

  it('三個選項由小到大且標準是 100%', () => {
    expect(FONT_SCALE_OPTIONS.map((o) => o.id)).toEqual(['base', 'medium', 'large']);
    expect(percentFor('base')).toBe(100);
    const percents = FONT_SCALE_OPTIONS.map((o) => o.percent);
    expect([...percents].sort((a, b) => a - b)).toEqual(percents);
  });

  it('isFontScale 擋掉非法值', () => {
    expect(isFontScale('large')).toBe(true);
    expect(isFontScale('huge')).toBe(false);
    expect(isFontScale(null)).toBe(false);
  });

  describe('首次繪製前的開機腳本', () => {
    it('照著存的值設 html font-size', () => {
      window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, 'large');
      new Function(FONT_SCALE_BOOT_SCRIPT)();
      expect(document.documentElement.style.fontSize).toBe('125%');
    });

    it('沒設定過時不動 html', () => {
      new Function(FONT_SCALE_BOOT_SCRIPT)();
      expect(document.documentElement.style.fontSize).toBe('');
    });

    it('localStorage 丟例外時不會炸掉整頁', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage disabled');
      });
      expect(() => new Function(FONT_SCALE_BOOT_SCRIPT)()).not.toThrow();
    });
  });
});
