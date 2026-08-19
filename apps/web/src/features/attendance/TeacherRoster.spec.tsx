import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeacherRoster } from './TeacherRoster';

const state = vi.hoisted(() => ({
  classes: [{ id: 'c1', name: '小班' }] as { id: string; name: string }[],
  students: [] as { id: string; name: string; classId: string }[],
  attendance: [] as { id: string; studentId: string; status: string }[],
  marked: [] as unknown[],
  bulked: [] as unknown[],
  bulkResult: undefined as unknown,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('../classes/hooks', () => ({
  useSelectedClass: () => ({
    classes: state.classes,
    classId: state.classes[0]?.id,
    setClassId: () => {},
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('../students/useSelectedStudent', () => ({
  useVisibleStudents: () => ({ data: state.students }),
}));
vi.mock('./hooks', () => ({
  useClassAttendance: () => ({
    data: state.attendance,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  }),
  useMarkAttendance: () => ({
    mark: { mutate: (b: unknown) => state.marked.push(b), isPending: false, isError: false, error: null },
    update: { mutate: (b: unknown) => state.marked.push(b), isPending: false, isError: false, error: null },
  }),
  useBulkMarkAttendance: () => ({
    mutate: (b: unknown) => state.bulked.push(b),
    isPending: false,
    data: state.bulkResult,
  }),
}));

const student = (id: string, name: string) => ({ id, name, classId: 'c1' });

describe('老師點名', () => {
  beforeEach(() => {
    state.classes = [{ id: 'c1', name: '小班' }];
    state.students = [student('s1', '王小明'), student('s2', '陳小美'), student('s3', '林大寶')];
    state.attendance = [];
    state.marked = [];
    state.bulked = [];
    state.bulkResult = undefined;
  });

  // 舊版要先選班級、再選日期，兩次之後才開始工作。
  it('打開就是今天這一班，不用先選', () => {
    render(<TeacherRoster />);
    expect(screen.getByText('今天')).toBeTruthy();
    expect(screen.getByText('王小明')).toBeTruthy();
  });

  it('只有一個班就不畫班級切換', () => {
    render(<TeacherRoster />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  // 這一頁存在的理由：九成的工作在這一下就結束。
  it('一顆按鈕把還沒點的全部標到校', () => {
    render(<TeacherRoster />);
    fireEvent.click(screen.getByRole('button', { name: /剩下 3 人全部標/ }));

    expect(state.bulked).toHaveLength(1);
    expect(state.bulked[0]).toEqual({ studentIds: ['s1', 's2', 's3'], status: 'PRESENT' });
  });

  it('已經點過的不會被算進「剩下幾人」', () => {
    state.attendance = [{ id: 'a1', studentId: 's1', status: 'PRESENT' }];
    render(<TeacherRoster />);
    expect(screen.getByRole('button', { name: /剩下 2 人全部標/ })).toBeTruthy();
  });

  it('全部點完就不再顯示那顆按鈕，改說今天點完了', () => {
    state.attendance = state.students.map((s, i) => ({
      id: `a${i}`,
      studentId: s.id,
      status: 'PRESENT',
    }));
    render(<TeacherRoster />);
    expect(screen.queryByRole('button', { name: /全部標/ })).toBeNull();
    expect(screen.getByText('今天點完了')).toBeTruthy();
  });

  // 老師不確定有沒有存進去就會再點一次 —— 進度與存檔回饋一直在最上面。
  it('進度條寫著幾人已點名，而且說已存檔', () => {
    state.attendance = [{ id: 'a1', studentId: 's1', status: 'PRESENT' }];
    render(<TeacherRoster />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByText('已存檔')).toBeTruthy();
  });

  // 九成是「到校」，所以只有它是大按鈕，其他三個是次要的。
  it('每個孩子只有到校是主要按鈕，例外收成小的', () => {
    render(<TeacherRoster />);
    const primary = screen.getAllByRole('button', { name: '到校' });
    expect(primary).toHaveLength(3);
    expect(primary[0]?.className).toContain('flex-1');
    expect(screen.getAllByRole('button', { name: '請假' })[0]?.className).not.toContain('flex-1');
  });

  it('點例外會送出那個學生那個狀態', () => {
    render(<TeacherRoster />);
    fireEvent.click(screen.getAllByRole('button', { name: '請假' })[0]!);
    expect(state.marked).toHaveLength(1);
    expect((state.marked[0] as { studentId: string; status: string }).studentId).toBe('s1');
    expect((state.marked[0] as { studentId: string; status: string }).status).toBe('LEAVE');
  });

  // 點完的收起來 —— 這一頁的價值在於它會變短。
  it('點完的收進可摺疊的一段', () => {
    state.attendance = [{ id: 'a1', studentId: 's1', status: 'PRESENT' }];
    const { container } = render(<TeacherRoster />);
    expect(container.querySelector('details')).not.toBeNull();
    expect(screen.getByText(/已完成（1）/)).toBeTruthy();
  });

  // 批次送出是一筆一筆各自成敗的，沒成功的必須講出來讓老師補點。
  it('批次有人沒成功時明說幾位，要老師自己補', () => {
    state.bulkResult = { ok: ['s1'], failed: [{ item: 's2', error: new Error('x') }] };
    render(<TeacherRoster />);
    expect(screen.getByRole('alert').textContent).toContain('有 1 位沒有成功');
  });

  it('沒帶班級時說清楚該找誰，不是丟一個空畫面', () => {
    state.classes = [];
    render(<TeacherRoster />);
    expect(screen.getByText('你目前沒有帶班級')).toBeTruthy();
  });

  it('班上沒有學生時也講人話', () => {
    state.students = [];
    render(<TeacherRoster />);
    expect(screen.getByText('這個班還沒有學生')).toBeTruthy();
  });
});
