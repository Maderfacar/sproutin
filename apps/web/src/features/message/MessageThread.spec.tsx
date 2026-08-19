import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageThread } from './MessageThread';
import type { MessageView } from '../../lib/types';

// Human Owner 2026-08-20 回報：同時是班導與其中一位學生的家長，
// 在那個孩子的聯絡簿裡兩種身分講的話長得一模一樣。
//
// 定案是 A 案：**位置不動（右邊永遠是我寫的），換的是標籤。**
// 把自己剛打的字丟到左邊會看起來像有人冒用你的名字。

const state = vi.hoisted(() => ({ messages: [] as MessageView[] }));

vi.mock('./hooks', () => ({
  useMessages: () => ({
    data: state.messages,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  }),
  useSendMessage: () => ({ mutate: () => {}, isPending: false, isError: false, error: null }),
  useMarkMessageRead: () => ({ mutate: () => {} }),
}));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ user: { id: 'me', displayName: '林曉萱', roles: [] } }),
}));

function msg(over: Partial<MessageView>): MessageView {
  return {
    id: 'm1',
    studentId: 'stu-1',
    classId: 'c1',
    senderId: 'me',
    senderName: '林曉萱',
    senderRelation: null,
    senderRole: null,
    category: 'GENERAL',
    body: '內容',
    createdAt: '2026-08-20T01:00:00.000Z',
    isRead: true,
    ...over,
  };
}

beforeEach(() => {
  state.messages = [];
});

describe('聯絡簿對話的身分標籤', () => {
  // 一般家長每一句都掛「· 母親」是廢話 —— 他本來就知道那是自己講的。
  it('我在這一串裡只有一種身分 → 自己的泡泡不標身分', () => {
    state.messages = [
      msg({ id: 'm1', senderRelation: 'MOTHER', body: '小宇今天有點咳嗽' }),
      msg({ id: 'm2', senderRelation: 'MOTHER', body: '謝謝老師' }),
    ];
    render(<MessageThread studentId="stu-1" />);
    expect(screen.queryByText(/^我 ·/)).toBeNull();
  });

  // 有兩種身分時，「這句是以誰的立場說的」才成為資訊。
  it('我用過兩種身分 → 自己的泡泡標出是以誰的立場說的', () => {
    state.messages = [
      msg({ id: 'm1', senderRole: 'TEACHER', body: '好的，我會多留意' }),
      msg({ id: 'm2', senderRelation: 'MOTHER', body: '另外我下週三要幫他請假' }),
    ];
    render(<MessageThread studentId="stu-1" />);
    expect(screen.getByText('我 · 老師')).toBeTruthy();
    expect(screen.getByText('我 · 母親')).toBeTruthy();
  });

  it('連著同一種身分講好幾句 → 只標第一句', () => {
    state.messages = [
      msg({ id: 'm1', senderRole: 'TEACHER', body: '好的' }),
      msg({ id: 'm2', senderRole: 'TEACHER', body: '我會多留意' }),
      msg({ id: 'm3', senderRelation: 'MOTHER', body: '下週三請假' }),
    ];
    render(<MessageThread studentId="stu-1" />);
    expect(screen.getAllByText('我 · 老師')).toHaveLength(1);
  });

  it('別人的訊息照常標名字與身分', () => {
    state.messages = [
      msg({ id: 'm1', senderId: 'other', senderName: '陳美玲', senderRelation: 'MOTHER' }),
    ];
    render(<MessageThread studentId="stu-1" />);
    expect(screen.getByText('陳美玲 · 母親')).toBeTruthy();
  });

  // 「右邊＝我寫的」是聊天介面最基本的約定。換標籤，不換邊。
  it('不管用哪一種身分，我的訊息都還是靠右', () => {
    state.messages = [
      msg({ id: 'm1', senderRole: 'TEACHER', body: '老師講的' }),
      msg({ id: 'm2', senderRelation: 'MOTHER', body: '家長講的' }),
    ];
    const { container } = render(<MessageThread studentId="stu-1" />);
    const rows = container.querySelectorAll('.items-end');
    expect(rows.length).toBe(2);
    expect(container.querySelectorAll('.items-start').length).toBe(0);
  });
});
