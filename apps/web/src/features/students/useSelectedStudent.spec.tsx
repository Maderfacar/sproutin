import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSelectedStudent } from './useSelectedStudent';

const state = vi.hoisted(() => ({
  persona: 'parent' as string,
  union: [] as { id: string; name: string }[],
  guardian: [] as { id: string; name: string }[],
  unionEnabled: [] as boolean[],
  guardianEnabled: [] as boolean[],
}));

vi.mock('../../lib/usePersona', () => ({
  useActivePersona: () => ({
    persona: state.persona,
    available: ['staff', 'teacher', 'parent'],
    setPersona: () => {},
    canSwitch: true,
  }),
}));
vi.mock('../../lib/queries', () => ({
  useMyStudents: (enabled = true) => {
    state.unionEnabled.push(enabled);
    return { data: enabled ? state.union : undefined, isLoading: false, isError: false };
  },
  useMyGuardianStudents: (enabled = true) => {
    state.guardianEnabled.push(enabled);
    return { data: enabled ? state.guardian : undefined, isLoading: false, isError: false };
  },
}));

function Probe() {
  const { students, studentId } = useSelectedStudent();
  return (
    <div>
      <p data-testid="names">{(students ?? []).map((s) => s.name).join(',')}</p>
      <p data-testid="selected">{studentId ?? '-'}</p>
    </div>
  );
}

describe('useSelectedStudent 的資料範圍', () => {
  beforeEach(() => {
    state.persona = 'parent';
    state.union = [
      { id: 'a', name: '別班小孩甲' },
      { id: 'b', name: '別班小孩乙' },
    ];
    state.guardian = [{ id: 'mine', name: '我家小明' }];
    state.unionEnabled = [];
    state.guardianEnabled = [];
  });

  // 園長兼家長切到家長身分時，舊版會列出全校 125 位，
  // 而且把排序第一個陌生小孩當成他的孩子（Human Owner 2026-08-20 回報）。
  it('家長身分只拿到自己監護的小孩', () => {
    render(<Probe />);
    expect(screen.getByTestId('names').textContent).toBe('我家小明');
    expect(screen.getByTestId('selected').textContent).toBe('mine');
  });

  // 只在前端過濾等於整份名單仍然送到了瀏覽器 —— 聯集那支查詢必須整個關掉。
  it('家長身分不會在背景把全校名單抓下來', () => {
    render(<Probe />);
    expect(state.unionEnabled.every((e) => e === false)).toBe(true);
    expect(state.guardianEnabled.some((e) => e === true)).toBe(true);
  });

  it('老師身分拿的是聯集（自班），不是監護關係', () => {
    state.persona = 'teacher';
    render(<Probe />);
    expect(screen.getByTestId('names').textContent).toBe('別班小孩甲,別班小孩乙');
    expect(state.guardianEnabled.every((e) => e === false)).toBe(true);
  });

  it('園長身分同樣拿聯集（全校）', () => {
    state.persona = 'staff';
    render(<Probe />);
    expect(screen.getByTestId('names').textContent).toBe('別班小孩甲,別班小孩乙');
  });

  // 換身分之後名單整個換掉，舊的選擇必須失效 ——
  // 否則家長身分會停在剛剛以老師身分選的那個學生。
  it('名單換掉後，不在新名單裡的選擇會被丟掉', () => {
    state.persona = 'teacher';
    const { rerender } = render(<Probe />);
    expect(screen.getByTestId('selected').textContent).toBe('a');

    state.persona = 'parent';
    rerender(<Probe />);
    expect(screen.getByTestId('selected').textContent).toBe('mine');
  });

  it('沒有監護關係的校方人員切到家長身分 → 空名單，不是別人的小孩', () => {
    state.guardian = [];
    render(<Probe />);
    expect(screen.getByTestId('names').textContent).toBe('');
    expect(screen.getByTestId('selected').textContent).toBe('-');
  });
});
