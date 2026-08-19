import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParentHome } from './ParentHome';

const state = vi.hoisted(() => ({
  students: [{ id: 's1', name: '陳小宇' }] as { id: string; name: string }[],
  attendance: [] as { id: string; date: string; status: string }[],
  book: [] as { arrivalTime: string | null; teacherNote: string | null }[],
  announcements: [] as { id: string; title: string; scope: string; createdAt: string }[],
  bus: undefined as unknown,
  flags: {} as Record<string, boolean>,
}));

// className 一定要透傳 —— 這一頁的斷言看的就是樣式類別（主要按鈕、狀態色）。
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
vi.mock('../../lib/session', () => ({
  useSession: () => ({
    user: {
      id: 'u1',
      displayName: '王媽媽',
      roles: [{ role: 'PARENT', scopeType: 'SCHOOL', scopeId: null }],
    },
  }),
}));
vi.mock('../../lib/branding', () => ({
  useBranding: () => ({ brandName: '晴光幼兒園', logoUrl: null, bannerUrl: null }),
}));
vi.mock('../../lib/queries', () => ({
  usePublicConfig: () => ({ data: { featureFlags: state.flags, cardOrder: [] } }),
}));
vi.mock('../students/useSelectedStudent', () => ({
  useSelectedStudent: () => ({
    students: state.students,
    studentId: state.students[0]?.id,
    setStudentId: () => {},
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('../attendance/hooks', () => ({ useAttendance: () => ({ data: state.attendance }) }));
vi.mock('../announcement/hooks', () => ({ useAnnouncements: () => ({ data: state.announcements }) }));
vi.mock('../communication-book/hooks', () => ({ useStudentBook: () => ({ data: state.book }) }));
vi.mock('../bus/hooks', () => ({ useMyBus: () => ({ data: state.bus }) }));

const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

describe('家長首頁', () => {
  beforeEach(() => {
    state.students = [{ id: 's1', name: '陳小宇' }];
    state.attendance = [];
    state.book = [];
    state.announcements = [];
    state.bus = undefined;
    state.flags = {};
  });

  // 這一頁存在的理由就是這句話。
  it('今天的答案是整頁最大的字', () => {
    state.attendance = [{ id: 'a1', date: `${todayKey}T00:00:00.000Z`, status: 'PRESENT' }];
    render(<ParentHome />);
    const answer = screen.getByText('已到校');
    expect(answer.className).toContain('text-3xl');
  });

  it('老師還沒點名時不假裝有答案', () => {
    render(<ParentHome />);
    expect(screen.getByText('還沒點名')).toBeTruthy();
    expect(screen.getByText('老師點完名這裡就會更新')).toBeTruthy();
  });

  it('請假用家長的話講，狀態色是等待不是錯誤', () => {
    state.attendance = [{ id: 'a1', date: `${todayKey}T00:00:00.000Z`, status: 'LEAVE' }];
    const { container } = render(<ParentHome />);
    expect(screen.getByText('今天請假')).toBeTruthy();
    expect(container.querySelector('.bg-wait-wash')).not.toBeNull();
  });

  // 到校時間以老師實際填的聯絡簿為準，沒有就不要編一個出來。
  it('聯絡簿有填到校時間就用它，沒有就退回一般說法', () => {
    state.attendance = [{ id: 'a1', date: `${todayKey}T00:00:00.000Z`, status: 'PRESENT' }];
    state.book = [{ arrivalTime: '08:12', teacherNote: null }];
    const { unmount } = render(<ParentHome />);
    expect(screen.getByText('早上 08:12 進教室')).toBeTruthy();
    unmount();

    state.book = [{ arrivalTime: null, teacherNote: null }];
    render(<ParentHome />);
    expect(screen.getByText('老師已完成點名')).toBeTruthy();
  });

  it('老師沒寫留言就不畫空卡片', () => {
    render(<ParentHome />);
    expect(screen.queryByText('老師今天寫的')).toBeNull();

    state.book = [{ arrivalTime: null, teacherNote: '午餐吃光光' }];
    render(<ParentHome />);
    expect(screen.getAllByText('老師今天寫的').length).toBeGreaterThan(0);
  });

  // 一頁只准一顆主要按鈕。家長真正會「做」的事只有請假。
  it('只有一顆主要按鈕，就是請假', () => {
    const { container } = render(<ParentHome />);
    const primaries = container.querySelectorAll('.bg-brand-primary');
    expect(primaries).toHaveLength(1);
    expect(screen.getByText('我要幫孩子請假')).toBeTruthy();
  });

  // 沒開娃娃車功能的園所不該看到那一條。
  it('園所沒開娃娃車就不出現娃娃車', () => {
    render(<ParentHome />);
    expect(screen.queryByText('娃娃車')).toBeNull();
  });

  it('有搭下午車就講下車或出發時間', () => {
    state.flags = { bus: true };
    state.bus = { ridesAfternoon: true, afternoon: null, afternoonDepart: '16:10' };
    render(<ParentHome />);
    expect(screen.getByText('下午 16:10 從學校出發')).toBeTruthy();
  });

  it('只有一個小孩就不出現切換（不必按一次確認自己是誰）', () => {
    render(<ParentHome />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('兩個小孩才出現切換，而且是攤開的名字不是下拉', () => {
    state.students = [
      { id: 's1', name: '陳小宇' },
      { id: 's2', name: '陳小美' },
    ];
    const { container } = render(<ParentHome />);
    expect(screen.getByRole('radiogroup')).toBeTruthy();
    expect(container.querySelector('select')).toBeNull();
  });

  it('還沒綁定到孩子時說清楚該找誰，不是丟一個空畫面', () => {
    state.students = [];
    render(<ParentHome />);
    expect(screen.getByText('還沒有連結到孩子的資料')).toBeTruthy();
  });
});
