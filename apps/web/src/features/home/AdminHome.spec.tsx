import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminHome } from './AdminHome';

const state = vi.hoisted(() => ({
  roles: [{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }] as unknown[],
  classes: [{ id: 'c1', name: '小班' }] as { id: string; name: string }[],
  perClass: [] as unknown[],
  totals: { students: 0, present: 0, leave: 0, absent: 0, marked: 0 },
  unfinished: [] as unknown[],
  leaves: [] as unknown[],
  flags: {} as Record<string, boolean>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '園長', roles: state.roles } }),
}));
vi.mock('../../lib/queries', () => ({
  usePublicConfig: () => ({ data: { featureFlags: state.flags, cardOrder: [] } }),
}));
vi.mock('../leave/hooks', () => ({ useSchoolPendingLeaves: () => ({ data: state.leaves }) }));
vi.mock('./useSchoolToday', () => ({
  useSchoolToday: () => ({
    classes: state.classes,
    perClass: state.perClass,
    totals: state.totals,
    unfinishedClasses: state.unfinished,
    isLoading: false,
  }),
}));

const cls = (over: Record<string, unknown> = {}) => ({
  classId: 'c1',
  name: '小班',
  total: 25,
  marked: 25,
  present: 23,
  leave: 2,
  absent: 0,
  unfinished: false,
  ...over,
});

describe('園長首頁', () => {
  beforeEach(() => {
    state.roles = [{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }];
    state.classes = [{ id: 'c1', name: '小班' }];
    state.perClass = [cls()];
    state.totals = { students: 25, present: 23, leave: 2, absent: 0, marked: 25 };
    state.unfinished = [];
    state.leaves = [];
    state.flags = {};
  });

  // 園長的首頁問的是「今天全園怎麼樣」，不是「有哪些功能」。
  it('一句話講全園今天到幾位', () => {
    render(<AdminHome />);
    expect(screen.getByText('23 位到校')).toBeTruthy();
    expect(screen.getByText('全園 25 位，已點名 25 位')).toBeTruthy();
  });

  it('沒事要處理時明講，不留一段空的待辦', () => {
    render(<AdminHome />);
    expect(screen.getByText('今天沒有需要你處理的事')).toBeTruthy();
  });

  // 這是園長真正需要被提醒的事 —— 哪一班還沒點完。
  it('有班級沒點完就列出來，並帶還差幾位', () => {
    state.perClass = [cls({ marked: 22, present: 22, leave: 0, unfinished: true })];
    state.unfinished = state.perClass;
    render(<AdminHome />);
    expect(screen.getByText('小班還沒點完名')).toBeTruthy();
    expect(screen.getByText('22 / 25 位')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('全校有待審請假時列成一件事', () => {
    state.leaves = [{ id: 'l1' }, { id: 'l2' }];
    render(<AdminHome />);
    expect(screen.getByText('請假等你決定')).toBeTruthy();
  });

  it('各班一覽會標出誰已完成、誰還差幾位', () => {
    state.perClass = [cls(), cls({ classId: 'c2', name: '中班', marked: 20, unfinished: true })];
    render(<AdminHome />);
    expect(screen.getByText('已完成')).toBeTruthy();
    expect(screen.getByText('差 5 位')).toBeTruthy();
  });

  // 設定好就不太動的東西放最後，不跟今天的事搶位置。
  it('管理入口在最後，而且園所沒開娃娃車就不出現娃娃車設定', () => {
    render(<AdminHome />);
    expect(screen.getByText('園所外觀')).toBeTruthy();
    expect(screen.queryByText('娃娃車設定')).toBeNull();
  });

  it('開了娃娃車才出現娃娃車設定', () => {
    state.flags = { bus: true };
    render(<AdminHome />);
    expect(screen.getByText('娃娃車設定')).toBeTruthy();
  });

  it('還沒建班級時說清楚下一步', () => {
    state.classes = [];
    render(<AdminHome />);
    expect(screen.getByText('還沒有建立班級')).toBeTruthy();
  });
});
