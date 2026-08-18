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
