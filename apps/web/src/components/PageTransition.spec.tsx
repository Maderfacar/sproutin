import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { act } from 'react';
import { PageTransition } from './PageTransition';

const pathname = vi.hoisted(() => ({ value: '/liff' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));

function cls(container: HTMLElement): string {
  return (container.firstElementChild as HTMLElement).className;
}

describe('PageTransition', () => {
  beforeEach(() => {
    pathname.value = '/liff';
  });

  it('第一次進來就是前進方向', () => {
    const { container } = render(<PageTransition>內容</PageTransition>);
    expect(cls(container)).toBe('page-forward');
  });

  it('點進子頁 → 從右邊滑進來', () => {
    const { container, rerender } = render(<PageTransition>內容</PageTransition>);
    pathname.value = '/liff/communication-book';
    rerender(<PageTransition>內容</PageTransition>);
    expect(cls(container)).toBe('page-forward');
  });

  it('按瀏覽器返回 → 從左邊滑回去', () => {
    const { container, rerender } = render(<PageTransition>內容</PageTransition>);
    pathname.value = '/liff/leave';
    rerender(<PageTransition>內容</PageTransition>);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    pathname.value = '/liff';
    rerender(<PageTransition>內容</PageTransition>);

    expect(cls(container)).toBe('page-back');
  });

  // 返回旗標用完就要歸零，否則之後每一次前進都會播成返回。
  it('返回之後再往前，方向要回到前進', () => {
    const { container, rerender } = render(<PageTransition>內容</PageTransition>);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    pathname.value = '/liff/leave';
    rerender(<PageTransition>內容</PageTransition>);
    expect(cls(container)).toBe('page-back');

    pathname.value = '/liff/attendance';
    rerender(<PageTransition>內容</PageTransition>);
    expect(cls(container)).toBe('page-forward');
  });

  it('同一頁重新 render 不會重播動畫（key 不變）', () => {
    const { container, rerender } = render(<PageTransition>內容</PageTransition>);
    const before = container.firstElementChild;
    rerender(<PageTransition>內容</PageTransition>);
    expect(container.firstElementChild).toBe(before);
  });
});
