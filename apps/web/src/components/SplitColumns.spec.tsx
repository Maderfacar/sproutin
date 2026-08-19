import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SplitColumns } from './SplitColumns';

const pathname = vi.hoisted(() => ({ value: '/liff/leave' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));

function grid(container: HTMLElement): Element | null {
  return container.querySelector('.lg\\:grid-cols-2');
}

describe('SplitColumns', () => {
  it('手機外框維持一欄（PersonaShell 的內容區只有 max-w-2xl，切兩欄會兩邊都太窄）', () => {
    pathname.value = '/liff/leave';
    const { container } = render(<SplitColumns primary={<p>點名</p>} secondary={<p>查詢</p>} />);

    expect(grid(container)).toBeNull();
    expect(screen.getByText('點名')).toBeTruthy();
    expect(screen.getByText('查詢')).toBeTruthy();
  });

  it('桌面外框且兩塊都有 → 切成兩欄', () => {
    pathname.value = '/admin/leave';
    const { container } = render(<SplitColumns primary={<p>點名</p>} secondary={<p>查詢</p>} />);

    expect(grid(container)).not.toBeNull();
  });

  // 家長只看得到「申請請假」一塊 —— 切欄會在右半邊開一個空洞。
  it('桌面外框但只有一塊內容 → 不切欄', () => {
    pathname.value = '/admin/leave';
    const { container } = render(<SplitColumns primary={false} secondary={<p>申請請假</p>} />);

    expect(grid(container)).toBeNull();
    expect(screen.getByText('申請請假')).toBeTruthy();
  });
});
