import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FontScaleControl } from './FontScaleControl';
import { FONT_SCALE_STORAGE_KEY } from '../lib/fontScale';

describe('FontScaleControl', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.fontSize = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('沒設定過時選在標準', () => {
    render(<FontScaleControl />);
    expect(screen.getByRole('radio', { name: /^標準/ }).getAttribute('aria-checked')).toBe('true');
  });

  it('開啟時對回已存的設定（不是每次都跳回標準）', () => {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, 'large');
    render(<FontScaleControl />);
    expect(screen.getByRole('radio', { name: /^大/ }).getAttribute('aria-checked')).toBe('true');
  });

  it('按下去立刻放大整頁並記住', () => {
    render(<FontScaleControl />);
    fireEvent.click(screen.getByRole('radio', { name: /^中/ }));

    expect(document.documentElement.style.fontSize).toBe('112.5%');
    expect(window.localStorage.getItem(FONT_SCALE_STORAGE_KEY)).toBe('medium');
    expect(screen.getByText(/只會改變這支手機上看到的大小/)).toBeTruthy();
  });

  // 不要沉默降級：存不進去就要講，不能讓家長以為設定記住了。
  it('瀏覽器不給存時明講「重開會回到標準」', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    render(<FontScaleControl />);
    fireEvent.click(screen.getByRole('radio', { name: /^大/ }));

    expect(document.documentElement.style.fontSize).toBe('125%');
    expect(screen.getByText(/重新開啟後會回到標準/)).toBeTruthy();
  });
});

// Human Owner 2026-08-19：「後台也要像前台一樣有個字體放大」。
// 後台左欄只有 14.5rem 寬 —— 說明文字擠成三行反而看不懂，所以只留三顆按鈕。
describe('後台左欄的精簡版', () => {
  it('三個選項都在，按下去一樣會放大整站', () => {
    render(<FontScaleControl compact />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);

    fireEvent.click(screen.getByRole('radio', { name: '大' }));
    expect(document.documentElement.style.fontSize).toBe('125%');
  });

  it('不畫每個選項的說明，也不畫那句「只會改變這支手機」', () => {
    render(<FontScaleControl compact />);
    expect(screen.queryByText('長輩也看得清楚')).toBeNull();
    expect(screen.queryByText(/只會改變這支手機/)).toBeNull();
  });

  // 存不進去照樣要講 —— 精簡不等於不誠實。
  it('瀏覽器不給存時仍然講出來', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    render(<FontScaleControl compact />);
    fireEvent.click(screen.getByRole('radio', { name: '中' }));
    expect(screen.getByText(/重新開啟後會回到標準/)).toBeTruthy();
  });
});
