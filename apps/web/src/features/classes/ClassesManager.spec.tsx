import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassesManager } from './ClassesManager';

// 打磨第二階段下一輪（後台斷句）：測的是段落結構，不是班級的 CRUD。
const state = vi.hoisted(() => ({
  roles: [{ role: 'OWNER' }] as { role: string }[],
  classes: [{ id: 'c1', name: '向日葵班', studentCount: 3 }] as {
    id: string;
    name: string;
    studentCount: number;
  }[],
}));

const noop = { mutate: () => {}, isPending: false, error: null };

vi.mock('next/navigation', () => ({ usePathname: () => '/liff/admin/classes' }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '王園長', roles: state.roles } }),
}));
vi.mock('./hooks', () => ({
  classErrorMessage: (_e: unknown, fallback: string) => fallback,
  useMyClasses: () => ({ data: state.classes, isLoading: false, isError: false, error: null }),
  useCreateClass: () => noop,
  useRenameClass: () => noop,
  useDeleteClass: () => noop,
}));

function headings(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h2')].map((h) => h.textContent ?? '');
}

describe('班級管理的斷句', () => {
  beforeEach(() => {
    state.roles = [{ role: 'OWNER' }];
  });

  it('分成「新增」與「目前的班級」兩段，新增在上面', () => {
    const { container } = render(<ClassesManager />);
    expect(headings(container)).toEqual(['新增班級', '目前的班級']);
  });

  // 後台整頁都是校方的東西，貼身分籤只是每一段都掛一次，變成噪音。
  it('後台頁面不貼身分籤，就算是老師兼家長', () => {
    state.roles = [{ role: 'OWNER' }, { role: 'PARENT' }];
    render(<ClassesManager />);
    expect(screen.queryByText(/以.*身分/)).toBeNull();
  });

  it('動手的那一段用粗線，翻閱的用細線', () => {
    const { container } = render(<ClassesManager />);
    expect(container.querySelectorAll('.border-b-2')).toHaveLength(1);
  });

  it('班級數量還看得到，只是從標題換成一行小字', () => {
    render(<ClassesManager />);
    expect(screen.getByText('共 1 個班級')).toBeTruthy();
  });

  it('沒有管理權限的人看到的還是擋下頁，不是空的段落', () => {
    state.roles = [{ role: 'TEACHER' }];
    const { container } = render(<ClassesManager />);
    expect(headings(container)).toEqual([]);
    expect(screen.getByText(/只有園長或行政人員/)).toBeTruthy();
  });
});
