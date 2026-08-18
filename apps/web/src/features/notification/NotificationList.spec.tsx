import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationList } from './NotificationList';
import type { NotificationView } from '../../lib/types';

const state = vi.hoisted(() => ({
  data: [] as NotificationView[],
  isLoading: false,
  isError: false,
  marked: [] as string[],
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/liff/notification' }));
vi.mock('./hooks', () => ({
  useNotifications: () => ({
    data: state.data,
    isLoading: state.isLoading,
    isError: state.isError,
    error: new Error('炸了'),
  }),
  useMarkNotificationRead: () => ({
    mutate: (id: string) => state.marked.push(id),
    isPending: false,
  }),
}));

function notif(over: Partial<NotificationView> = {}): NotificationView {
  return {
    id: 'n1',
    type: 'AnnouncementPublished',
    payload: { announcementId: 'a1' },
    readAt: null,
    createdAt: new Date().toISOString(),
    title: '校外教學通知單',
    subtitle: '全校公告',
    ...over,
  };
}

describe('訊息中心', () => {
  beforeEach(() => {
    state.data = [];
    state.isLoading = false;
    state.isError = false;
    state.marked = [];
  });

  it('載入中顯示骨架屏，不是「載入中…」那行字', () => {
    state.isLoading = true;
    const { container } = render(<NotificationList />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText(/載入/)).toBeNull();
  });

  it('沒有訊息時給得出下一步，不是一句「目前沒有通知」', () => {
    render(<NotificationList />);
    expect(screen.getByText('目前沒有新訊息')).toBeTruthy();
    expect(screen.getByText(/公告、老師的留言與請假結果/)).toBeTruthy();
  });

  it('顯示後端補上的標題與副標，而不是通知的 type', () => {
    state.data = [notif()];
    render(<NotificationList />);
    expect(screen.getByText('校外教學通知單')).toBeTruthy();
    expect(screen.getByText('全校公告')).toBeTruthy();
    expect(screen.queryByText('AnnouncementPublished')).toBeNull();
  });

  it('每一則是連結，點進去回到它原本那一頁', () => {
    state.data = [
      notif({ id: 'n1', type: 'MessageSent', payload: { studentId: 'stu-9' }, title: '王老師：午睡很好' }),
    ];
    render(<NotificationList />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/liff/communication-book/stu-9');
  });

  it('點一則＝看過了 → 立刻標已讀', () => {
    state.data = [notif({ id: 'n7' })];
    render(<NotificationList />);
    fireEvent.click(screen.getByRole('link'));
    expect(state.marked).toEqual(['n7']);
  });

  it('已讀的不會重複再標一次', () => {
    state.data = [notif({ id: 'n7', readAt: new Date().toISOString() })];
    render(<NotificationList />);
    fireEvent.click(screen.getByRole('link'));
    expect(state.marked).toEqual([]);
  });

  it('未讀有小圓點並計數', () => {
    state.data = [notif({ id: 'a' }), notif({ id: 'b', readAt: new Date().toISOString() })];
    render(<NotificationList />);
    expect(screen.getByText('1 則未讀')).toBeTruthy();
    expect(screen.getAllByLabelText('未讀')).toHaveLength(1);
  });

  // 畫成連結卻按了沒反應最糟；沒有去處就明確畫成不可點。
  it('沒見過的 type 不畫成連結', () => {
    state.data = [notif({ type: 'SomethingNew', payload: {}, title: 'SomethingNew' })];
    render(<NotificationList />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  // 不要沉默降級：連不上就說連不上，不能回一份看起來正常但空的收件匣。
  it('取不到資料時明講錯誤，不是顯示「沒有新訊息」', () => {
    state.isError = true;
    render(<NotificationList />);
    expect(screen.getByText(/操作失敗/)).toBeTruthy();
    expect(screen.queryByText('目前沒有新訊息')).toBeNull();
  });
});
