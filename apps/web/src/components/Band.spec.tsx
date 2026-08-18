import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Band } from './Band';

const roles = vi.hoisted(() => ({ value: [{ role: 'PARENT' }] as { role: string }[] }));
vi.mock('../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '陳美玲', roles: roles.value } }),
}));

describe('Band（版面的標點符號）', () => {
  it('畫出類別、標題與說明', () => {
    roles.value = [{ role: 'PARENT' }];
    render(
      <Band kind="review" title="陳小宇 的聯絡簿" description="老師送出後這裡就會更新">
        內容
      </Band>,
    );
    expect(screen.getByText('查看')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '陳小宇 的聯絡簿' })).toBeTruthy();
    expect(screen.getByText('老師送出後這裡就會更新')).toBeTruthy();
  });

  it('沒給說明就不畫空白的一行', () => {
    roles.value = [{ role: 'PARENT' }];
    const { container } = render(
      <Band kind="action" title="今天要填的聯絡簿">
        內容
      </Band>,
    );
    expect(container.querySelectorAll('p').length).toBe(1); // 只有類別那一行
  });

  // 這是這個元件存在的主要理由：份量差別就是斷句。
  it('「要做的事」用粗線收住，「查看」用細線', () => {
    roles.value = [{ role: 'PARENT' }];
    const { container: a } = render(
      <Band kind="action" title="做">
        x
      </Band>,
    );
    const { container: b } = render(
      <Band kind="review" title="看">
        x
      </Band>,
    );
    expect(a.querySelector('.border-b-2')).not.toBeNull();
    expect(b.querySelector('.border-b-2')).toBeNull();
  });

  describe('身分籤', () => {
    it('老師兼家長 → 兩段都標得出身分', () => {
      roles.value = [{ role: 'TEACHER' }, { role: 'PARENT' }];
      render(
        <Band kind="action" title="今天要填的聯絡簿" audience="staff">
          內容
        </Band>,
      );
      expect(screen.getByText('以老師身分')).toBeTruthy();
    });

    it('只是家長 → 不顯示（對他是廢話）', () => {
      roles.value = [{ role: 'PARENT' }];
      render(
        <Band kind="review" title="陳小宇 的聯絡簿" audience="parent">
          內容
        </Band>,
      );
      expect(screen.queryByText('以家長身分')).toBeNull();
    });

    it('只是老師 → 不顯示', () => {
      roles.value = [{ role: 'TEACHER' }];
      render(
        <Band kind="action" title="今天要填的聯絡簿" audience="staff">
          內容
        </Band>,
      );
      expect(screen.queryByText('以老師身分')).toBeNull();
    });

    it('沒指定 audience → 不顯示，就算是多重身分', () => {
      roles.value = [{ role: 'TEACHER' }, { role: 'PARENT' }];
      render(
        <Band kind="manage" title="園所設定">
          內容
        </Band>,
      );
      expect(screen.queryByText(/以.*身分/)).toBeNull();
    });
  });

  it('內容照樣渲染出來', () => {
    roles.value = [{ role: 'PARENT' }];
    render(
      <Band kind="review" title="標題">
        <p>裡面的東西</p>
      </Band>,
    );
    expect(screen.getByText('裡面的東西')).toBeTruthy();
  });
});
