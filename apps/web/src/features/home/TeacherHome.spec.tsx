import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeacherHome } from './TeacherHome';

const state = vi.hoisted(() => ({
  classes: [{ id: 'c1', name: '小班' }] as { id: string; name: string }[],
  students: [] as { id: string; name: string; classId: string }[],
  attendance: [] as { studentId: string }[],
  book: [] as { studentId: string; teacherNote: string | null }[],
  leaves: [] as unknown[],
  flags: {} as Record<string, boolean>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('../../lib/session', () => ({
  useSession: () => ({
    user: {
      id: 'u1',
      displayName: '李老師',
      roles: [{ role: 'TEACHER', scopeType: 'CLASS', scopeId: 'c1' }],
    },
  }),
}));
vi.mock('../../lib/queries', () => ({
  usePublicConfig: () => ({ data: { featureFlags: state.flags, cardOrder: [] } }),
}));
vi.mock('../students/useSelectedStudent', () => ({
  useVisibleStudents: () => ({ data: state.students }),
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
vi.mock('../attendance/hooks', () => ({ useClassAttendance: () => ({ data: state.attendance }) }));
vi.mock('../communication-book/hooks', () => ({
  useClassBook: () => ({ data: state.book }),
  hasContent: (e: { teacherNote: string | null }) => e.teacherNote !== null,
}));
vi.mock('../leave/hooks', () => ({ useClassPendingLeaves: () => ({ data: state.leaves }) }));

const student = (id: string, name: string) => ({ id, name, classId: 'c1' });

describe('導師首頁', () => {
  beforeEach(() => {
    state.classes = [{ id: 'c1', name: '小班' }];
    state.students = [student('s1', '王小明'), student('s2', '陳小美')];
    state.attendance = [];
    state.book = [];
    state.leaves = [];
    state.flags = {};
  });

  // 導師要的不是功能清單，是「我今天還有什麼沒做」。
  it('一句話講今天還有幾件事', () => {
    render(<TeacherHome />);
    expect(screen.getByText('今天還有 2 件事')).toBeTruthy();
  });

  it('數的是「還要去幾個地方」，不是總共幾個小動作', () => {
    state.leaves = [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }];
    render(<TeacherHome />);
    // 點名 2 人 + 聯絡簿 2 本 + 請假 3 件 = 三類，不是七件
    expect(screen.getByText('今天還有 3 件事')).toBeTruthy();
  });

  it('每一塊都寫清楚還差多少，並帶數字徽章', () => {
    render(<TeacherHome />);
    expect(screen.getByText('還有 2 人沒點')).toBeTruthy();
    expect(screen.getByText('2 本還沒寫')).toBeTruthy();
  });

  // 首頁的價值在於它會變短。
  it('做完的事不留在原位，改成一行已完成', () => {
    state.attendance = [{ studentId: 's1' }, { studentId: 's2' }];
    render(<TeacherHome />);
    expect(screen.queryByText(/還有 .* 人沒點/)).toBeNull();
    expect(screen.getByText('✓ 全班都點名了')).toBeTruthy();
  });

  it('全部做完時整頁只剩已完成', () => {
    state.attendance = [{ studentId: 's1' }, { studentId: 's2' }];
    state.book = [
      { studentId: 's1', teacherNote: '好' },
      { studentId: 's2', teacherNote: '好' },
    ];
    render(<TeacherHome />);
    expect(screen.getByText('今天都做完了')).toBeTruthy();
    expect(screen.getByText('✓ 聯絡簿都寫好了')).toBeTruthy();
    expect(screen.getByText('✓ 沒有等你審核的請假')).toBeTruthy();
  });

  it('園所沒開娃娃車就不出現娃娃車', () => {
    render(<TeacherHome />);
    expect(screen.queryByText('娃娃車')).toBeNull();
  });

  it('沒帶班級時說清楚該找誰', () => {
    state.classes = [];
    render(<TeacherHome />);
    expect(screen.getByText('你目前沒有帶班級')).toBeTruthy();
  });
});
