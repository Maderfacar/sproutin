import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentBookScreen } from './StudentBookScreen';

// 網址帶著 studentId，所以身分的範圍也要套在它身上。
//
// Human Owner 2026-08-20 回報：家長身分從訊息中心點進來，看得到別人小孩的聯絡簿。
// 訊息中心那一側已經在後端切乾淨了，但**網址是可以被貼、被記住、被舊通知帶進來的**
// —— 入口擋住不等於門擋住。

const state = vi.hoisted(() => ({
  students: [{ id: 'mine', name: '陳小宇' }] as { id: string; name: string }[],
  isLoading: false,
  canMarkAttendance: false,
}));

vi.mock('../students/useSelectedStudent', () => ({
  useVisibleStudents: () => ({ data: state.students, isLoading: state.isLoading }),
}));
vi.mock('../../lib/useCapabilities', () => ({
  useCapabilities: () => ({ canMarkAttendance: state.canMarkAttendance }),
}));
vi.mock('./StudentBookView', () => ({
  StudentBookView: ({ canEdit }: { canEdit: boolean }) => (
    <p>{canEdit ? '聯絡簿（可填寫）' : '聯絡簿（只能看）'}</p>
  ),
}));

beforeEach(() => {
  state.students = [{ id: 'mine', name: '陳小宇' }];
  state.isLoading = false;
  state.canMarkAttendance = false;
});

describe('單一學生的聯絡簿', () => {
  it('是我看得到的孩子 → 正常打開', () => {
    render(<StudentBookScreen studentId="mine" />);
    expect(screen.getByText('聯絡簿（只能看）')).toBeTruthy();
  });

  it('不在目前身分的名單裡 → 不給看，而且說得出下一步', () => {
    render(<StudentBookScreen studentId="someone-else" />);
    expect(screen.queryByText(/聯絡簿（/)).toBeNull();
    expect(screen.getByText('看不到這個孩子的聯絡簿')).toBeTruthy();
    expect(screen.getByText(/切回老師身分再打開一次/)).toBeTruthy();
  });

  // 健康與留言（今日狀況、體溫、老師的短語）是**老師填的**。
  // 家長在聯絡簿上看得到結果，但不該點得動那些控制項。
  it('家長身分只能看，不給填寫區', () => {
    render(<StudentBookScreen studentId="mine" />);
    expect(screen.getByText('聯絡簿（只能看）')).toBeTruthy();
  });

  it('老師身分才有填寫區', () => {
    state.canMarkAttendance = true;
    render(<StudentBookScreen studentId="mine" />);
    expect(screen.getByText('聯絡簿（可填寫）')).toBeTruthy();
  });

  // 名單還沒回來就先不判斷 —— 這裡是介面的守門，最後一道永遠在後端。
  it('名單還在載入 → 先畫骨架，不要誤判成看不到', () => {
    state.isLoading = true;
    const { container } = render(<StudentBookScreen studentId="mine" />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('看不到這個孩子的聯絡簿')).toBeNull();
  });
});
