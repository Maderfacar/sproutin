import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorPage from './error';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function boom(digest?: string): Error & { digest?: string } {
  return Object.assign(new Error('TypeError: cannot read property x of undefined'), { digest });
}

// 沒有這一頁的話，程式出錯時跳出來的是 Next.js 的英文預設頁 —— 家長看不懂，demo 現場也難看。
describe('程式出錯的頁面', () => {
  it('用人話說明，而且說清楚不是使用者的錯', () => {
    render(<ErrorPage error={boom()} reset={() => {}} />);
    expect(screen.getByRole('heading', { name: '這一頁出了點狀況' })).toBeTruthy();
    expect(screen.getByText(/不是你操作錯了/)).toBeTruthy();
  });

  it('給得出下一步：重新載入 + 回入口', () => {
    const reset = vi.fn();
    render(<ErrorPage error={boom()} reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: '重新載入這一頁' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: '回到入口' }).getAttribute('href')).toBe('/');
  });

  // 錯誤訊息可能含內部結構，對使用者也沒有意義 —— 只給一組可以拿來回報的代碼。
  it('不把技術細節印在畫面上，只留回報代碼', () => {
    const { container } = render(<ErrorPage error={boom('a1b2c3')} reset={() => {}} />);
    expect(container.textContent).not.toContain('TypeError');
    expect(screen.getByText(/a1b2c3/)).toBeTruthy();
  });

  it('沒有代碼時不畫那一行空的', () => {
    render(<ErrorPage error={boom()} reset={() => {}} />);
    expect(screen.queryByText(/回報時請附上/)).toBeNull();
  });

  it('分頁標題不再是那個誰都一樣的「Sproutin」', () => {
    render(<ErrorPage error={boom()} reset={() => {}} />);
    expect(document.title).toBe('出了點狀況 · Sproutin');
  });
});
