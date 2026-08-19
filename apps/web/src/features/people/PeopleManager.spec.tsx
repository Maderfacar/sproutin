import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PeopleManager } from './PeopleManager';
import type { UserView } from '../../lib/types';

const state = vi.hoisted(() => ({
  people: [] as UserView[],
}));

// vi.mock 的 factory 會被提升到檔案最上面，所以它用到的東西也必須提升 ——
// 直接寫成頂層 const 會在 mock 執行時還沒初始化。
const idleMutation = vi.hoisted(() => () => ({
  mutate: () => {},
  isPending: false,
  isError: false,
  error: null,
}));

vi.mock('../../lib/session', () => ({
  useSession: () => ({
    user: {
      id: 'u-owner',
      displayName: '園長',
      roles: [{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }],
    },
  }),
}));
vi.mock('../classes/hooks', () => ({ useMyClasses: () => ({ data: [] }) }));
vi.mock('../students/adminHooks', () => ({ useAdminStudents: () => ({ data: [] }) }));
vi.mock('./hooks', () => ({
  usePeople: () => ({ data: state.people, isLoading: false, isError: false, error: null }),
  useCreatePerson: idleMutation,
  useUpdatePerson: idleMutation,
  useAddGuardianship: idleMutation,
  useRemoveGuardianship: idleMutation,
  useAddTeacherAssignment: idleMutation,
  useRemoveTeacherAssignment: idleMutation,
  useGrantRole: idleMutation,
  useRevokeRole: idleMutation,
  useBindingCodes: () => ({ data: [] }),
  useIssueBindingCode: idleMutation,
  useRevokeBindingCode: idleMutation,
  useUnbindLine: idleMutation,
  RELATION_LABEL: { FATHER: '父親', MOTHER: '母親', GRANDPARENT: '祖父母', GUARDIAN: '監護人' },
  peopleErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const person = (id: string, displayName: string): UserView => ({
  id,
  displayName,
  status: 'ACTIVE',
  hasLineLinked: true,
  roles: [{ role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null }],
  teaching: [],
  guardianOf: [],
});

// 編輯面板的「顯示名稱」欄。新增表單的那個輸入框在 <dialog> 裡（關著的面板），
// 用「不在 dialog 內」把它排除掉，比數索引穩。
function nameField(): HTMLInputElement {
  const el = Array.from(document.querySelectorAll<HTMLInputElement>('input[maxlength="40"]')).find(
    (i) => !i.closest('dialog'),
  );
  if (!el) throw new Error('找不到編輯面板的姓名欄');
  return el;
}

describe('人員管理的編輯面板', () => {
  beforeEach(() => {
    state.people = [person('a', '林老師'), person('b', '張老師')];
  });

  it('點編輯會打開那個人的面板', () => {
    render(<PeopleManager />);
    fireEvent.click(screen.getByRole('button', { name: '編輯 林老師' }));
    expect(screen.getByText('編輯 林老師')).toBeTruthy();
    expect(nameField().value).toBe('林老師');
  });

  // Human Owner 2026-08-20 回報：沒關掉面板就直接點另一個人的「編輯」，
  // 內容換過去了但姓名欄還停在前一位 —— React 沿用同一個元件實例，本地狀態沒重來。
  it('沒關閉就直接改點另一個人，姓名欄要跟著換人', () => {
    render(<PeopleManager />);
    fireEvent.click(screen.getByRole('button', { name: '編輯 林老師' }));
    expect(nameField().value).toBe('林老師');

    fireEvent.click(screen.getByRole('button', { name: '編輯 張老師' }));
    expect(screen.getByText('編輯 張老師')).toBeTruthy();
    expect(nameField().value).toBe('張老師');
  });

  it('在姓名欄改過字之後換人，也不會把改到一半的字帶過去', () => {
    render(<PeopleManager />);
    fireEvent.click(screen.getByRole('button', { name: '編輯 林老師' }));
    fireEvent.change(nameField(), { target: { value: '打到一半' } });
    expect(nameField().value).toBe('打到一半');

    fireEvent.click(screen.getByRole('button', { name: '編輯 張老師' }));
    expect(nameField().value).toBe('張老師');
  });

  it('再點同一個人的編輯就關掉面板', () => {
    render(<PeopleManager />);
    fireEvent.click(screen.getByRole('button', { name: '編輯 林老師' }));
    fireEvent.click(screen.getByRole('button', { name: '編輯 林老師' }));
    expect(screen.queryByText('編輯 林老師')).toBeNull();
  });
});
