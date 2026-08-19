import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSelectedStudent } from './useSelectedStudent';

const state = vi.hoisted(() => ({
  persona: 'parent' as string,
  union: [] as { id: string; name: string }[],
  guardian: [] as { id: string; name: string }[],
  teaching: [] as { id: string; name: string }[],
  unionEnabled: [] as boolean[],
  guardianEnabled: [] as boolean[],
  teachingEnabled: [] as boolean[],
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
  useMyTeachingStudents: (enabled = true) => {
    state.teachingEnabled.push(enabled);
    return { data: enabled ? state.teaching : undefined, isLoading: false, isError: false };
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
    state.teaching = [{ id: 't1', name: '我班上的孩子' }];
    state.unionEnabled = [];
    state.guardianEnabled = [];
    state.teachingEnabled = [];
  });

  // 園長兼家長切到家長身分時，舊版會列出全校 125 位，
  // 而且把排序第一個陌生小孩當成他的孩子（Human Owner 2026-08-20 回報）。
  it('家長身分只拿到自己監護的小孩', () => {
    render(<Probe />);
    expect(screen.getByTestId('names').textContent).toBe('我家小明');
    expect(screen.getByTestId('selected').textContent).toBe('mine');
  });

  // 第二次踩到同一個坑：只帶一班的導師（同時也是園長）在點名與聯絡簿看得到別班的孩子。
  it('導師身分只拿到自己帶的班上的孩子', () => {
    state.persona = 'teacher';
    render(<Probe />);
    expect(screen.getByTestId('names').textContent).toBe('我班上的孩子');
  });

  // 只在前端過濾等於整份名單仍然送到了瀏覽器 —— 其他來源必須整個關掉。
  it('家長身分不會在背景把全校或全班名單抓下來', () => {
    render(<Probe />);
    expect(state.unionEnabled.every((e) => e === false)).toBe(true);
    expect(state.teachingEnabled.every((e) => e === false)).toBe(true);
    expect(state.guardianEnabled.some((e) => e === true)).toBe(true);
  });

  it('導師身分也不會在背景把全校名單抓下來', () => {
    state.persona = 'teacher';
    render(<Probe />);
    expect(state.unionEnabled.every((e) => e === false)).toBe(true);
    expect(state.guardianEnabled.every((e) => e === false)).toBe(true);
  });

  it('園長身分拿聯集（全校本來就該看得到）', () => {
    state.persona = 'staff';
    render(<Probe />);
    expect(screen.getByTestId('names').textContent).toBe('別班小孩甲,別班小孩乙');
  });

  it('隨車老師拿聯集（他的範圍由路線決定，不是班級）', () => {
    state.persona = 'bus';
    render(<Probe />);
    expect(screen.getByTestId('names').textContent).toBe('別班小孩甲,別班小孩乙');
  });

  // 換身分之後名單整個換掉，舊的選擇必須失效 ——
  // 否則家長身分會停在剛剛以老師身分選的那個學生。
  it('名單換掉後，不在新名單裡的選擇會被丟掉', () => {
    state.persona = 'teacher';
    const { rerender } = render(<Probe />);
    expect(screen.getByTestId('selected').textContent).toBe('t1');

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

  it('沒有帶班的人切到導師身分 → 空名單，不是全校', () => {
    state.persona = 'teacher';
    state.teaching = [];
    render(<Probe />);
    expect(screen.getByTestId('names').textContent).toBe('');
  });
});
