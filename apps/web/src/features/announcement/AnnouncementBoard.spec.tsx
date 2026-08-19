import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnouncementBoard } from './AnnouncementBoard';

const state = vi.hoisted(() => ({
  roles: [{ role: 'PARENT' }] as { role: string }[],
  created: [] as unknown[],
}));

vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '測試', roles: state.roles } }),
}));
vi.mock('./AnnouncementList', () => ({ AnnouncementList: () => <p>公告列表</p> }));
vi.mock('../classes/hooks', () => ({
  useSelectedClass: () => ({
    classes: [{ id: 'c1', name: '小班' }],
    classId: 'c1',
    setClassId: () => {},
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('./hooks', () => ({
  useCreateAnnouncement: () => ({
    mutate: (b: unknown) => state.created.push(b),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

describe('公告頁', () => {
  beforeEach(() => {
    state.roles = [{ role: 'PARENT' }];
    state.created = [];
  });

  // 家長只讀 —— 給他一顆發公告的按鈕是錯的。
  it('家長只看到列表，沒有發布按鈕', () => {
    render(<AnnouncementBoard />);
    expect(screen.getByText('公告列表')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /發一則公告/ })).toBeNull();
  });

  // 即使是老師，進這一頁十次有九次是來看有沒有新的 —— 發布是例外。
  it('老師多一顆按鈕，但表單沒有攤在頁面上', () => {
    state.roles = [{ role: 'TEACHER' }];
    render(<AnnouncementBoard />);
    expect(screen.getByRole('button', { name: /發一則公告/ })).toBeTruthy();
    // 表單在面板裡，而面板是關著的（關著的 <dialog> 瀏覽器不顯示）。
    const sheet = document.querySelector<HTMLDialogElement>('dialog[aria-label="發一則公告"]');
    expect(sheet?.open).toBe(false);
  });

  it('老師只能發給班級，不會出現全校選項', () => {
    state.roles = [{ role: 'TEACHER' }];
    render(<AnnouncementBoard />);
    fireEvent.click(screen.getByRole('button', { name: /發一則公告/ }));
    expect(screen.queryByRole('radio', { name: '全校' })).toBeNull();
  });

  it('園長可以選全校或單一班級', () => {
    state.roles = [{ role: 'OWNER' }];
    render(<AnnouncementBoard />);
    fireEvent.click(screen.getByRole('button', { name: /發一則公告/ }));
    expect(screen.getByRole('radio', { name: '全校' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '單一班級' })).toBeTruthy();
  });

  it('沒寫標題不會送出，並且就地說明', () => {
    state.roles = [{ role: 'TEACHER' }];
    render(<AnnouncementBoard />);
    fireEvent.click(screen.getByRole('button', { name: /發一則公告/ }));
    fireEvent.click(screen.getByRole('button', { name: '發布公告' }));

    expect(state.created).toHaveLength(0);
    expect(screen.getByText('請寫一個標題，家長在列表上先看到的就是它。')).toBeTruthy();
  });

  it('填好就送得出去，老師發的是班級公告', () => {
    state.roles = [{ role: 'TEACHER' }];
    render(<AnnouncementBoard />);
    fireEvent.click(screen.getByRole('button', { name: /發一則公告/ }));
    fireEvent.change(screen.getByPlaceholderText('例如：9/1 開學典禮'), {
      target: { value: '開學典禮' },
    });
    fireEvent.change(screen.getByPlaceholderText(/時間、地點/), {
      target: { value: '9/1 上午 9 點' },
    });
    fireEvent.click(screen.getByRole('button', { name: '發布公告' }));

    expect(state.created).toEqual([
      { scope: 'CLASS', classId: 'c1', title: '開學典禮', body: '9/1 上午 9 點' },
    ]);
  });
});
