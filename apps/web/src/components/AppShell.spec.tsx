import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { act } from 'react';
import { AppShell } from './AppShell';

const pathname = vi.hoisted(() => ({ value: '/liff' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));
vi.mock('../lib/branding', () => ({
  useBranding: () => ({ brandName: '晴光幼兒園', logoUrl: null, bannerUrl: null }),
}));

function header(container: HTMLElement): HTMLElement {
  const el = container.querySelector('header');
  if (!el) throw new Error('找不到頁首');
  return el as HTMLElement;
}

function scrollTo(y: number): void {
  window.scrollY = y;
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('AppShell 的頁首', () => {
  beforeEach(() => {
    window.scrollY = 0;
  });

  it('首頁在最頂端時透明疊在封面圖上（白字、看不見的底線）', () => {
    pathname.value = '/liff';
    const { container } = render(<AppShell>內容</AppShell>);
    const cls = header(container).className;

    expect(cls).toContain('bg-transparent');
    expect(cls).toContain('border-transparent');
    expect(container.querySelector('.font-serif')?.className).toContain('text-white');
  });

  it('首頁往下捲之後換回實色底，並且一直固定在最上方', () => {
    pathname.value = '/liff';
    const { container } = render(<AppShell>內容</AppShell>);

    scrollTo(120);
    const cls = header(container).className;

    expect(cls).toContain('bg-surface/85');
    expect(cls).toContain('border-line');
    expect(cls).toContain('sticky');
    expect(cls).toContain('top-0');
  });

  // 只有首頁有 hero；其他頁一開始就必須是實色，否則會白字浮在米白底上。
  it('沒有封面圖的頁面一進來就是實色頁首', () => {
    pathname.value = '/liff/leave';
    const { container } = render(<AppShell>內容</AppShell>);
    const cls = header(container).className;

    expect(cls).toContain('bg-surface/85');
    expect(cls).not.toContain('bg-transparent');
  });

  // 從別頁返回時瀏覽器會還原捲動位置，掛載當下就不在頂端了。
  it('掛載時已經捲在半路 → 直接是實色，不會先閃一下透明', () => {
    pathname.value = '/liff';
    window.scrollY = 400;
    const { container } = render(<AppShell>內容</AppShell>);

    expect(header(container).className).toContain('bg-surface/85');
  });
});
