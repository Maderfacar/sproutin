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

describe('發送訊息的版面', () => {
  beforeEach(() => {
    state.roles = [{ role: 'OWNER' }];
  });

  // 群發送出後收不回來，回頭查「上次那則送出去了沒」的次數比新發一則還多，
  // 所以頁面主體是紀錄，編輯器收進面板（一進來是關著的）。
  it('主體是送出紀錄，編輯器收在面板裡而且預設關著', () => {
    const { container } = render(<PushCampaignPanel />);

    expect(screen.getByText('送出紀錄')).toBeTruthy();
    expect(screen.getByText('歷史清單')).toBeTruthy();
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('只有一顆主要按鈕，就是「發一則群發訊息」', () => {
    render(<PushCampaignPanel />);
    expect(screen.getByRole('button', { name: /發一則群發訊息/ })).toBeTruthy();
  });

  // 寫在頁面最上面的警語在手機上會先被捲掉，要被提醒的那一刻正是手指停在按鈕上的那一刻。
  it('「收不回來」這句話留在按鈕旁邊', () => {
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
