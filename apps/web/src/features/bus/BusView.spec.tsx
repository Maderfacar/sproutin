import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusView } from './BusView';

// 這一組測的是「版面的斷句」（components/Band）：哪幾段出現、誰排前面、身分籤貼在哪裡。
// 面板本身各有自己的測試，這裡一律換成一行字。
const state = vi.hoisted(() => ({ roles: [{ role: 'PARENT' }] as { role: string }[] }));

vi.mock('next/navigation', () => ({ usePathname: () => '/liff/bus' }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '王小明', roles: state.roles } }),
}));
vi.mock('../students/useSelectedStudent', () => ({
  useSelectedStudent: () => ({
    students: [{ id: 's1', name: '陳小宇' }],
    studentId: 's1',
    setStudentId: () => {},
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('./BusBoardingPanel', () => ({ BusBoardingPanel: () => <p>點名面板</p> }));
vi.mock('./BusTodayCard', () => ({ BusTodayCard: () => <p>今日狀態卡</p> }));

function headings(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h2')].map((h) => h.textContent ?? '');
}

describe('娃娃車頁的斷句', () => {
  beforeEach(() => {
    state.roles = [{ role: 'PARENT' }];
  });

  it('家長只有「今天的娃娃車」一段，看不到點名與設定', () => {
    const { container } = render(<BusView />);
    expect(headings(container)).toEqual(['今天的娃娃車']);
    expect(screen.queryByText('點名面板')).toBeNull();
    expect(screen.getByText('今日狀態卡')).toBeTruthy();
  });

  // 「今天要做的事」永遠排在「翻閱查詢」前面，而且份量更重。
  it('隨車老師：點名排在查看前面，而且用粗線收住', () => {
    state.roles = [{ role: 'BUS_TEACHER' }];
    const { container } = render(<BusView />);
    expect(headings(container)).toEqual(['今天的點名', '查看單一學生']);
    expect(container.querySelectorAll('.border-b-2')).toHaveLength(1);
  });

  it('園長：設定排在最後（偶爾才動一次，不跟今天的事搶位置）', () => {
    state.roles = [{ role: 'OWNER' }];
    const { container } = render(<BusView />);
    expect(headings(container)).toEqual(['今天的點名', '查看單一學生', '娃娃車設定']);
  });

  it('兼家長的隨車老師不再看到身分籤，清單混著誰仍用文案講明', () => {
    state.roles = [{ role: 'BUS_TEACHER' }, { role: 'PARENT' }];
    render(<BusView />);
    expect(screen.queryByText(/以.*身分/)).toBeNull();
    // 清單裡自己的小孩與車上的孩子混在一起，session 沒帶監護關係 —— 只能用文案講。
    expect(screen.getByText('你車上的孩子和你自己的小孩都在這個清單裡')).toBeTruthy();
  });

  it('純家長不會看到身分籤（對他是廢話）', () => {
    render(<BusView />);
    expect(screen.queryByText(/以.*身分/)).toBeNull();
  });
});
