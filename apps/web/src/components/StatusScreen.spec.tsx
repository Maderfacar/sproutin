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
});
