import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusScreen } from './StatusScreen';

describe('StatusScreen', () => {
  it('error 狀態顯示訊息 + LINE sub（除錯用）', () => {
    render(<StatusScreen status="error" message="登入失敗" sub="Uabc123" />);
    expect(screen.getByText('登入失敗')).toBeTruthy();
    expect(screen.getByText('Uabc123')).toBeTruthy();
  });

  it('loading 狀態顯示預設載入文字', () => {
    render(<StatusScreen status="loading" />);
    expect(screen.getByText('載入中…')).toBeTruthy();
  });

  it('error 但無 sub 時不顯示 sub 區塊', () => {
    render(<StatusScreen status="error" message="無設定" />);
    expect(screen.queryByText(/LINE User ID/)).toBeNull();
  });

  // 這個元件大多長在外框裡（標題底下）。要求一個螢幕高會在下面拖出一大段空白，
  // 而且外框已經有一個 <main>，巢狀 <main> 不合法。
  it('預設不佔滿整頁，且不是 <main>（外框裡已經有一個）', () => {
    const { container } = render(<StatusScreen status="loading" />);
    const root = container.firstElementChild!;
    expect(root.tagName).toBe('DIV');
    expect(root.className).not.toContain('min-h-screen');
  });

  it('fullScreen 時佔滿整頁並用 <main>（還沒套上外框的那幾層）', () => {
    const { container } = render(<StatusScreen fullScreen status="loading" />);
    const root = container.firstElementChild!;
    expect(root.tagName).toBe('MAIN');
    expect(root.className).toContain('min-h-screen');
  });
});
