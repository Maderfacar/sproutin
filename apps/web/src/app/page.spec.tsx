import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Home from './page';

// 根路徑是**不特定人**看得到的一頁（搜尋引擎、隨手貼網址的人）。
// 這裡原本是 Phase 5 的骨架頁，把整包 runtime config 印在畫面上；
// 那些值依 ADR-001 本就非機密，但攤給不特定人看沒有好處。這條測試守著它不要再長回來。
//
// 品牌由這一頁自己載入（不靠 BrandingProvider —— 根路徑不在 AppShell/AdminShell 之下，
// 硬用 useBranding 會丟例外並讓 next build 產生這一頁時失敗）。

vi.mock('../lib/config', () => ({
  loadPublicConfig: vi.fn(async () => ({ brandName: '晴光幼兒園', logoUrl: null })),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('根路徑', () => {
  it('不顯示任何系統內部資訊（功能開關 / 卡片順序 / liffId）', () => {
    const { container } = render(<Home />);
    const text = container.textContent ?? '';

    expect(text).not.toContain('featureFlags');
    expect(text).not.toContain('cardOrder');
    expect(text).not.toContain('liffId');
    expect(text).not.toContain('skeleton');
    expect(container.querySelector('pre')).toBeNull();
  });

  it('只回答「該從哪裡進去」：家長從 LINE、園所人員進後台', async () => {
    render(<Home />);

    await waitFor(() => expect(screen.getByText('晴光幼兒園')).toBeTruthy());
    expect(screen.getByText(/請用手機開啟園所的 LINE 官方帳號/)).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/admin/login');
  });
});

// 公開頁面不該因為後端沒回應就整頁爆掉 —— 這正是 CI 紅燈那次的根因。
describe('根路徑 — 載不到設定時', () => {
  it('仍然畫得出來，只是用中性名稱', async () => {
    const { loadPublicConfig } = await import('../lib/config');
    vi.mocked(loadPublicConfig).mockRejectedValueOnce(new Error('offline'));

    render(<Home />);
    expect(screen.getByText(/請用手機開啟園所的 LINE 官方帳號/)).toBeTruthy();
  });
});
