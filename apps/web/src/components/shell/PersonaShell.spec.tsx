import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AuthUser } from '@sproutin/shared';
import { resetPersonaForTests } from '../../lib/usePersona';
import { PersonaShell } from './PersonaShell';

const session = vi.hoisted(() => ({
  roles: [] as AuthUser['roles'],
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/liff' }));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../../lib/branding', () => ({
  useBranding: () => ({ brandName: '晴光幼兒園', logoUrl: null, bannerUrl: null }),
}));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '測試', roles: session.roles } }),
}));

const r = (...roles: AuthUser['roles'][number]['role'][]): AuthUser['roles'] =>
  roles.map((role) => ({ role, scopeType: 'SCHOOL' as const, scopeId: null }));

function tabLabels(): string[] {
  const nav = document.querySelector('nav');
  return nav ? Array.from(nav.querySelectorAll('a')).map((a) => a.textContent ?? '') : [];
}

describe('PersonaShell 的三套殼', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPersonaForTests();
    session.roles = [];
  });

  it('家長：今天 / 聯絡簿 / 請假 / 我的', () => {
    session.roles = r('PARENT');
    render(<PersonaShell>內容</PersonaShell>);
    expect(tabLabels()).toEqual(['今天', '聯絡簿', '請假', '我的']);
  });

  it('班導師：今天 / 點名 / 聯絡簿 / 我的', () => {
    session.roles = r('TEACHER');
    render(<PersonaShell>內容</PersonaShell>);
    expect(tabLabels()).toEqual(['今天', '點名', '聯絡簿', '我的']);
  });

  it('園長：總覽 / 名單 / 訊息 / 我的', () => {
    session.roles = r('OWNER');
    render(<PersonaShell>內容</PersonaShell>);
    expect(tabLabels()).toEqual(['總覽', '名單', '訊息', '我的']);
  });

  // 一條路線點完就關掉，四個頁籤對他是負擔。
  it('隨車老師沒有底部頁籤', () => {
    session.roles = r('BUS_TEACHER');
    render(<PersonaShell>內容</PersonaShell>);
    expect(document.querySelector('nav')).toBeNull();
  });

  // 純家長或純老師看到一顆只有一個選項的鈕，是在暗示他漏掉了什麼。
  it('只有一種身分的人看不到切換鈕', () => {
    session.roles = r('PARENT');
    render(<PersonaShell>內容</PersonaShell>);
    expect(screen.queryByRole('button', { name: /家長/ })).toBeNull();
  });

  it('老師的小孩也在園裡 → 出現切換鈕，預設站在工作身分', () => {
    session.roles = r('TEACHER', 'PARENT');
    render(<PersonaShell>內容</PersonaShell>);
    expect(screen.getByRole('button', { name: /老師/ })).toBeTruthy();
    expect(tabLabels()).toEqual(['今天', '點名', '聯絡簿', '我的']);
  });

  it('切成家長身分後整組頁籤跟著換掉', () => {
    session.roles = r('TEACHER', 'PARENT');
    render(<PersonaShell>內容</PersonaShell>);

    fireEvent.click(screen.getByRole('button', { name: /老師/ }));
    fireEvent.click(screen.getByRole('button', { name: /以家長身分/ }));

    expect(tabLabels()).toEqual(['今天', '聯絡簿', '請假', '我的']);
  });

  // 早先的版本只在校方那一側畫切換鈕，於是切到家長之後就找不到路回去
  // —— 等於把人關在家長身分裡出不來（Human Owner 2026-08-20 回報）。
  it('切到家長身分之後那顆鈕還在，而且切得回去', () => {
    session.roles = r('OWNER', 'TEACHER', 'PARENT');
    render(<PersonaShell>內容</PersonaShell>);

    fireEvent.click(screen.getByRole('button', { name: /園長/ }));
    fireEvent.click(screen.getByRole('button', { name: /以家長身分/ }));
    expect(tabLabels()).toEqual(['今天', '聯絡簿', '請假', '我的']);

    // 出口必須還在
    const back = screen.getByRole('button', { name: /目前以家長身分/ });
    expect(back).toBeTruthy();

    fireEvent.click(back);
    fireEvent.click(screen.getByRole('button', { name: /以園長身分/ }));
    expect(tabLabels()).toEqual(['總覽', '名單', '訊息', '我的']);
  });

  it('四種身分都齊的人，四個選項都切得到', () => {
    session.roles = r('OWNER', 'ADMIN', 'TEACHER', 'PARENT');
    render(<PersonaShell>內容</PersonaShell>);

    fireEvent.click(screen.getByRole('button', { name: /目前以園長身分/ }));
    // 面板裡的選項以「以…身分」開頭；頁首那顆鈕是「目前以…身分」，用開頭錨點分得開。
    // 園長與行政是同一種「看事情的形狀」，所以是三個選項不是四個。
    expect(screen.getByRole('button', { name: /^以園長身分/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^以老師身分/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^以家長身分/ })).toBeTruthy();
  });

  // 記住的身分必須對照現有角色重驗，否則角色被拔掉後會卡在點什麼都 403 的殼裡。
  it('記著的身分已經失去角色 → 退回這個人還有的身分', () => {
    window.localStorage.setItem('sproutin.persona', 'staff');
    session.roles = r('PARENT');
    render(<PersonaShell>內容</PersonaShell>);
    expect(tabLabels()).toEqual(['今天', '聯絡簿', '請假', '我的']);
  });

  it('家長的頁首放園所名字，內容照常渲染', () => {
    session.roles = r('PARENT');
    render(<PersonaShell>今天的內容</PersonaShell>);
    expect(screen.getByText('晴光幼兒園')).toBeTruthy();
    expect(screen.getByText('今天的內容')).toBeTruthy();
  });
});
