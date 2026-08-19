import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnouncementBoard } from './AnnouncementBoard';
import { resetPersonaForTests } from '../../lib/usePersona';

const state = vi.hoisted(() => ({
  roles: [{ role: 'PARENT' }] as { role: string }[],
  created: [] as unknown[],
}));

vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '測試', roles: state.roles } }),
}));
// useCapabilities 會問「現在在哪一種外框」（桌面後台不受身分影響）。
vi.mock('next/navigation', () => ({ usePathname: () => '/liff/announcement' }));
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
    window.localStorage.clear();
    resetPersonaForTests();
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

  // Human Owner 2026-08-20 回報：老師在公告頁可以發全校公告。
  // 他確實是園長（後端也會放行），但導師的形狀是「我這一班」——
  // 要發全校就切回園長身分。
  it('園長兼導師切到老師身分 → 沒有全校那個選項', () => {
    state.roles = [{ role: 'OWNER' }, { role: 'TEACHER' }];
    window.localStorage.setItem('sproutin.persona', 'teacher');
    resetPersonaForTests();

    render(<AnnouncementBoard />);
    fireEvent.click(screen.getByRole('button', { name: /發一則公告/ }));

    expect(screen.queryByRole('radio', { name: '全校' })).toBeNull();
  });

  it('同一個人切回園長身分，全校那個選項就回來了', () => {
    state.roles = [{ role: 'OWNER' }, { role: 'TEACHER' }];
    window.localStorage.setItem('sproutin.persona', 'staff');
    resetPersonaForTests();

    render(<AnnouncementBoard />);
    fireEvent.click(screen.getByRole('button', { name: /發一則公告/ }));

    expect(screen.getByRole('radio', { name: '全校' })).toBeTruthy();
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

  // Human Owner 2026-08-20 回報：家長的公告頁上不該有「發一則公告」。
  //
  // 這一條測的不是權限 —— 他確實是老師，後端也會放行。測的是**入口出現在誰的世界裡**：
  // 舊版用 roleFlags（角色聯集）判斷，於是老師兼家長切到家長身分之後，
  // 發布按鈕還跟著他走進家長的世界。這是同一個坑的第四次（前三次是資料範圍）。
  it('老師兼家長切到家長身分 → 公告頁沒有發布按鈕', () => {
    state.roles = [{ role: 'TEACHER' }, { role: 'PARENT' }];
    window.localStorage.setItem('sproutin.persona', 'parent');
    resetPersonaForTests();

    render(<AnnouncementBoard />);

    expect(screen.getByText('公告列表')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /發一則公告/ })).toBeNull();
    // 說明文字也要換成家長那一句，不能還在講「發出去的公告都留在這裡」。
    expect(screen.getByText('園所與班級發布的消息')).toBeTruthy();
  });

  it('同一個人切回老師身分，按鈕就回來了', () => {
    state.roles = [{ role: 'TEACHER' }, { role: 'PARENT' }];
    window.localStorage.setItem('sproutin.persona', 'teacher');
    resetPersonaForTests();

    render(<AnnouncementBoard />);

    expect(screen.getByRole('button', { name: /發一則公告/ })).toBeTruthy();
  });
});
