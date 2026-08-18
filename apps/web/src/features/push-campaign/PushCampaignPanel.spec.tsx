import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PushCampaignPanel } from './PushCampaignPanel';

const state = vi.hoisted(() => ({ roles: [{ role: 'OWNER' }] as { role: string }[] }));

vi.mock('next/navigation', () => ({ usePathname: () => '/liff/admin/messages' }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '王園長', roles: state.roles } }),
}));
vi.mock('./MessageComposer', () => ({ MessageComposer: () => <p>卡片編輯器</p> }));
vi.mock('./CampaignHistory', () => ({ CampaignHistory: () => <p>歷史清單</p> }));

function headings(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h2')].map((h) => h.textContent ?? '');
}

describe('發送訊息的斷句', () => {
  beforeEach(() => {
    state.roles = [{ role: 'OWNER' }];
  });

  it('要做的事在上、送出紀錄在下', () => {
    const { container } = render(<PushCampaignPanel />);
    expect(headings(container)).toEqual(['做一張卡片發出去', '送出紀錄']);
    expect(container.querySelectorAll('.border-b-2')).toHaveLength(1);
  });

  // 送出後收不回來，這句話要在按鈕旁邊看得到，不能只寫在頁面最上面。
  it('「收不回來」這句話留在發送那一段的說明上', () => {
    render(<PushCampaignPanel />);
    expect(screen.getByText(/送出後沒有辦法收回/)).toBeTruthy();
  });

  it('老師打不開這一頁', () => {
    state.roles = [{ role: 'TEACHER' }];
    render(<PushCampaignPanel />);
    expect(screen.getByText(/只有園長或行政人員/)).toBeTruthy();
    expect(screen.queryByText('卡片編輯器')).toBeNull();
  });
});
