import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParentBus } from './ParentBus';

// 家長的娃娃車頁。取代最後一個聯集視圖（BusView）之後，這一頁對家長只剩一件事：
// 我小孩今天上下車了沒。所以測的是「有沒有多出東西來」。

const state = vi.hoisted(() => ({
  students: [{ id: 's1', name: '陳小宇' }] as { id: string; name: string }[],
  isError: false,
}));

vi.mock('../students/useSelectedStudent', () => ({
  useSelectedStudent: () => ({
    students: state.students,
    studentId: state.students[0]?.id,
    setStudentId: () => {},
    isLoading: false,
    isError: state.isError,
  }),
}));
vi.mock('./BusTodayCard', () => ({ BusTodayCard: () => <p>今日狀態卡</p> }));

beforeEach(() => {
  state.students = [{ id: 's1', name: '陳小宇' }];
  state.isError = false;
});

describe('家長的娃娃車頁', () => {
  // 清單裡只有一個人卻要他先選一次，等於逼他確認自己是誰。
  it('只有一個小孩：不畫選擇器，直接就是那張卡', () => {
    render(<ParentBus />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByText('今日狀態卡')).toBeTruthy();
  });

  it('兩個小孩才畫選擇器', () => {
    state.students = [
      { id: 's1', name: '陳小宇' },
      { id: 's2', name: '陳小美' },
    ];
    render(<ParentBus />);
    expect(screen.getByRole('radiogroup', { name: '選擇孩子' })).toBeTruthy();
  });

  // 綁定還沒做好的家長進來會是空的 —— 要告訴他去找誰，不是丟一句「無資料」。
  it('還沒綁定到孩子：講清楚下一步是找園所', () => {
    state.students = [];
    render(<ParentBus />);
    expect(screen.getByText('還沒有連結到孩子的資料')).toBeTruthy();
    expect(screen.queryByText('今日狀態卡')).toBeNull();
  });

  it('讀不到資料時給的是人話，不是錯誤代碼', () => {
    state.isError = true;
    render(<ParentBus />);
    expect(screen.getByRole('alert').textContent).toContain('讀不到孩子的資料');
  });
});
