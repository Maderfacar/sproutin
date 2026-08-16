import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SchoolAdminConfig } from '@sproutin/shared';
import { CardsSection } from './CardsSection';

// 園所自訂「家長頁上出現哪些功能、順序如何」的行為（Human Owner 2026-08-17）：
// 已上線功能預設顯示、可被明確關閉；規劃中功能預設隱藏、開啟後顯示為即將推出。

const baseDraft: SchoolAdminConfig = {
  brandName: '測試園所',
  logoUrl: null,
  primaryColor: '#2f6b4f',
  secondaryColor: '#74b48a',
  bannerUrl: null,
  featureFlags: {},
  cardOrder: [],
  leaveRequiresApproval: true,
  theme: 'warm',
  dashboardLayout: 'grid',
};

function renderSection(draft: Partial<SchoolAdminConfig> = {}) {
  const onChange = vi.fn();
  render(<CardsSection draft={{ ...baseDraft, ...draft }} onChange={onChange} />);
  return onChange;
}

describe('CardsSection', () => {
  it('已上線功能預設為開啟；按下開關送出「關閉」', () => {
    const onChange = renderSection();
    const toggle = screen.getByRole('switch', { name: '請假 顯示於家長頁' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith({
      featureFlags: expect.objectContaining({ leave: false }),
    });
  });

  it('規劃中功能預設為關閉；開啟後寫入該功能的旗標（娃娃車→bus）', () => {
    const onChange = renderSection();
    const toggle = screen.getByRole('switch', { name: '娃娃車 顯示於家長頁' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith({
      featureFlags: expect.objectContaining({ bus: true }),
    });
  });

  it('已開啟的規劃中功能顯示為「規劃中 · 顯示為即將推出」', () => {
    renderSection({ featureFlags: { payment: true } });
    const toggle = screen.getByRole('switch', { name: '收費繳費 顯示於家長頁' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getAllByText('規劃中 · 顯示為即將推出').length).toBeGreaterThan(0);
  });

  it('往下移會送出新的完整順序，且第一張卡片不能再往上移', () => {
    const onChange = renderSection({ cardOrder: ['announcement', 'attendance', 'leave'] });

    expect(screen.getByRole('button', { name: '公告 往上移' }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '公告 往下移' }));
    const order = onChange.mock.calls[0]?.[0]?.cardOrder as string[];
    expect(order.slice(0, 3)).toEqual(['attendance', 'announcement', 'leave']);
    expect(order.length).toBe(12); // 全部卡片都留在順序清單中
  });
});
