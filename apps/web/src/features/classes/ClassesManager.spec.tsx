import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassesManager } from './ClassesManager';

const state = vi.hoisted(() => ({
  roles: [{ role: 'OWNER' }] as { role: string }[],
  classes: [{ id: 'c1', name: '向日葵班', studentCount: 3 }] as {
    id: string;
    name: string;
    studentCount: number;
  }[],
  created: [] as unknown[],
  deleted: [] as unknown[],
}));

const noop = vi.hoisted(() => () => ({ mutate: () => {}, isPending: false, error: null }));

vi.mock('next/navigation', () => ({ usePathname: () => '/liff/admin/classes' }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '王園長', roles: state.roles } }),
}));
vi.mock('./hooks', () => ({
  classErrorMessage: (_e: unknown, fallback: string) => fallback,
  useMyClasses: () => ({ data: state.classes, isLoading: false, isError: false, error: null }),
  useCreateClass: () => ({
    mutate: (b: unknown) => state.created.push(b),
    isPending: false,
    error: null,
  }),
  useRenameClass: noop,
  useDeleteClass: () => ({
    mutate: (b: unknown) => state.deleted.push(b),
    isPending: false,
    error: null,
  }),
}));

// 面板（<dialog>）的標題也是 h2，但關著的時候瀏覽器不顯示它 ——
// 這裡只數「頁面上看得到的」段落標題。
function headings(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h2')]
    .filter((h) => !h.closest('dialog'))
    .map((h) => h.textContent ?? '');
}

function sheet(label: string): HTMLDialogElement {
  const el = document.querySelector<HTMLDialogElement>(`dialog[aria-label="${label}"]`);
  if (!el) throw new Error(`找不到面板：${label}`);
  return el;
}

describe('班級管理（清單頁版型）', () => {
  beforeEach(() => {
    state.roles = [{ role: 'OWNER' }];
    state.classes = [{ id: 'c1', name: '向日葵班', studentCount: 3 }];
    state.created = [];
    state.deleted = [];
  });

  // 管理頁多數時候是來「看一眼名單」，不是來填表的 —— 表單常駐在最上面
  // 等於每次進來都要先捲過它。
  it('一進來是一顆新增按鈕加一份名單，表單沒有攤在頁面上', () => {
    const { container } = render(<ClassesManager />);
    expect(screen.getByRole('button', { name: /新增班級/ })).toBeTruthy();
    expect(headings(container)).toEqual(['目前的班級（1）']);
    // 表單在面板裡，而面板是關著的（關著的 <dialog> 瀏覽器不顯示）。
    expect(sheet('新增班級').open).toBe(false);
  });

  it('數量寫在標題裡，不必另外一行小字', () => {
    state.classes = [
      { id: 'c1', name: '向日葵班', studentCount: 3 },
      { id: 'c2', name: '鬱金香班', studentCount: 0 },
    ];
    const { container } = render(<ClassesManager />);
    expect(headings(container)).toEqual(['目前的班級（2）']);
  });

  it('按新增才從底部滑出表單', () => {
    render(<ClassesManager />);
    fireEvent.click(screen.getByRole('button', { name: /新增班級/ }));
    expect(screen.getByPlaceholderText('例如：向日葵班')).toBeTruthy();
  });

  it('沒填名字不會送出，並且就地說明', () => {
    render(<ClassesManager />);
    fireEvent.click(screen.getByRole('button', { name: /新增班級/ }));
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    expect(state.created).toHaveLength(0);
    expect(screen.getByText('請填班級名稱。')).toBeTruthy();
  });

  // 後端擋下「班上還有學生」，前端要先講清楚而不是讓人按了才發現。
  it('班上還有學生時刪除鈕是停用的', () => {
    render(<ClassesManager />);
    const del = screen.getByRole('button', { name: '刪除 向日葵班' });
    expect(del).toHaveProperty('disabled', true);
  });

  // 就地展開兩顆確認按鈕會讓整列跳動，手指容易按到隔壁。
  it('空班的刪除確認是一個面板，不是就地長出來的按鈕', () => {
    state.classes = [{ id: 'c2', name: '空班', studentCount: 0 }];
    render(<ClassesManager />);

    fireEvent.click(screen.getByRole('button', { name: '刪除 空班' }));
    expect(sheet('刪除「空班」').open).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '確定刪除' }));
    expect(state.deleted).toEqual([{ id: 'c2' }]);
  });

  it('一個班都沒有時說的是人話，不是「無資料」', () => {
    state.classes = [];
    render(<ClassesManager />);
    expect(screen.getByText('還沒有任何班級')).toBeTruthy();
  });

  // 後台整頁都是校方的東西，貼身分籤只是每一段都掛一次，變成噪音。
  it('後台頁面不貼身分籤，就算是老師兼家長', () => {
    state.roles = [{ role: 'OWNER' }, { role: 'PARENT' }];
    render(<ClassesManager />);
    expect(screen.queryByText(/以.*身分/)).toBeNull();
  });

  it('沒有管理權限的人看到的還是擋下頁，不是空的段落', () => {
    state.roles = [{ role: 'TEACHER' }];
    const { container } = render(<ClassesManager />);
    expect(headings(container)).toEqual([]);
    expect(screen.getByText(/只有園長或行政人員/)).toBeTruthy();
  });
});
