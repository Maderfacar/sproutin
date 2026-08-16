'use client';

import { Fragment, useState, type FormEvent } from 'react';
import { useMessages, useSendMessage, useMarkMessageRead } from './hooks';
import { useSession } from '../../lib/session';
import { apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import type { MessageView } from '../../lib/types';

function byCreatedAsc(a: MessageView, b: MessageView): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}月 ${d.getDate()}日 · 週${week}`;
}

function timeLabel(iso: string): string {
  return iso.slice(11, 16);
}

// 訊息串（Student-centered，雙向，清葉）。自己靠右（森綠）、校方靠左（柔和）;
// 依日期分隔;未讀可點標已讀;底部 pill 輸入 + 圓形送出。
export function MessageThread({ studentId }: { studentId: string }) {
  const { user } = useSession();
  const { data, isLoading, isError, error } = useMessages(studentId);
  const sendMessage = useSendMessage();
  const markRead = useMarkMessageRead(studentId);
  const [body, setBody] = useState('');

  function handleSend(e: FormEvent): void {
    e.preventDefault();
    if (!body.trim()) return;
    sendMessage.mutate({ studentId, body: body.trim() }, { onSuccess: () => setBody('') });
  }

  const sorted = data ? [...data].sort(byCreatedAsc) : [];

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-sm text-ink-soft">載入訊息中…</p>}
      {isError && <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>}
      {data && data.length === 0 && (
        <p className="py-6 text-center text-sm text-ink-soft">還沒有訊息，開始跟老師聊聊吧。</p>
      )}

      {sorted.length > 0 && (
        <div className="flex flex-col gap-3.5">
          {sorted.map((msg, i) => {
            const mine = msg.senderId === user.id;
            const showUnread = !mine && !msg.isRead;
            const prevDay = i > 0 ? (sorted[i - 1]?.createdAt.slice(0, 10) ?? null) : null;
            const showDay = msg.createdAt.slice(0, 10) !== prevDay;
            return (
              <Fragment key={msg.id}>
                {showDay && (
                  <div className="flex items-center gap-3 py-1 text-[10px] font-bold tracking-[0.1em] text-ink-soft">
                    <span className="h-px flex-1 bg-line" />
                    {dayLabel(msg.createdAt)}
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[82%] px-4 py-2.5 text-sm leading-relaxed ${
                      mine
                        ? 'rounded-[18px_4px_18px_18px] bg-brand-primary text-white'
                        : 'rounded-[4px_18px_18px_18px] text-ink'
                    }`}
                    style={
                      mine
                        ? undefined
                        : { background: 'color-mix(in srgb, var(--ink) 7%, var(--surface))' }
                    }
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 px-1 text-[10px] text-ink-soft">
                    <span>{timeLabel(msg.createdAt)}</span>
                    {showUnread && (
                      <button
                        type="button"
                        onClick={() => markRead.mutate(msg.id)}
                        className="font-semibold text-brand-primary underline"
                      >
                        點此標已讀
                      </button>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2.5 pt-1">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="輸入訊息…"
          className="h-11 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-brand-primary"
        />
        <button
          type="submit"
          aria-label="送出"
          disabled={sendMessage.isPending || !body.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <Icon name="send" className="h-5 w-5" />
        </button>
      </form>
      {sendMessage.isError && <p className="text-sm text-red-600">{apiErrorMessage(sendMessage.error)}</p>}
    </div>
  );
}
