import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnouncementView } from './AnnouncementView';

const state = vi.hoisted(() => ({ roles: [{ role: 'PARENT' }] as { role: string }[] }));

vi.mock('next/navigation', () => ({ usePathname: () => '/liff/announcement' }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'u1', displayName: '王小明', roles: state.roles } }),
}));
vi.mock('./TeacherAnnouncePanel', () => ({ TeacherAnnouncePanel: () => <p>發布面板</p> }));
vi.mock('./AnnouncementList', () => ({ AnnouncementList: () => <p>公告清單</p> }));

function headings(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h2')].map((h) => h.textContent ?? '');
}

describe('公告頁的斷句', () => {
  beforeEach(() => {
    state.roles = [{ role: 'PARENT' }];
  });

  it('家長只看得到列表，而且說的是「園所與班級發布的消息」', () => {
    const { container } = render(<AnnouncementView />);
    expect(headings(container)).toEqual(['公告列表']);
    expect(screen.getByText('園所與班級發布的消息')).toBeTruthy();
    expect(screen.queryByText('發布面板')).toBeNull();
  });

  it('老師：發布排在列表前面，只講得出「發給你帶的班級」', () => {
    state.roles = [{ role: 'TEACHER' }];
    const { container } = render(<AnnouncementView />);
    expect(headings(container)).toEqual(['發一則公告', '公告列表']);
    expect(screen.getByText('發給你帶的班級')).toBeTruthy();
  });

  it('園長：發布那段講得出可以發全校', () => {
    state.roles = [{ role: 'OWNER' }];
    render(<AnnouncementView />);
    expect(screen.getByText('可以發給全校，也可以指定單一班級')).toBeTruthy();
  });

  // 身分籤已退役：身分改由整個殼區分，一次只給一種（Human Owner 2026-08-20）。
  it('老師兼家長也不再看到身分籤', () => {
    state.roles = [{ role: 'TEACHER' }, { role: 'PARENT' }];
    render(<AnnouncementView />);
    expect(screen.queryByText(/以.*身分/)).toBeNull();
  });
});
