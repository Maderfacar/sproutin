'use client';

import { useState, type FormEvent } from 'react';
import { useMessages, useSendMessage, useMarkMessageRead } from './hooks';
import { useSession } from '../../lib/session';
import { apiErrorMessage } from '../../lib/api';
import type { MessageView } from '../../lib/types';

function byCreatedAsc(a: MessageView, b: MessageView): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function timeLabel(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

// 訊息串（Student-centered，雙向）。自己發的靠右、校方/他人靠左;未讀可點一下標為已讀;底部可發訊。
export function MessageThread({ studentId }: { studentId: string }) {
  const { user } = useSession();
  const { data, isLoading, isError, error } = useMessages(studentId);
  const sendMessage = useSendMessage();
  const markRead = useMarkMessageRead(studentId);
  const [body, setBody] = useState('');

  function handleSend(e: FormEvent): void {
    e.preventDefault();
    if (!body.trim()) return;
    sendMessage.mutate(
      { studentId, body: body.trim() },
      { onSuccess: () => setBody('') },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-sm text-gray-500">載入訊息中…</p>}
      {isError && <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>}
      {data && data.length === 0 && <p className="text-sm text-gray-500">目前沒有訊息。</p>}

      {data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {[...data].sort(byCreatedAsc).map((msg) => {
            const mine = msg.senderId === user.id;
            const showUnread = !mine && !msg.isRead;
            return (
              <li key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-brand-primary text-white' : 'border border-gray-200 bg-white text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <div className={`mt-1 flex items-center gap-2 text-xs ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                    <span>{timeLabel(msg.createdAt)}</span>
                    {showUnread && (
                      <button
                        type="button"
                        onClick={() => markRead.mutate(msg.id)}
                        className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800"
                      >
                        未讀 · 點此標為已讀
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="輸入訊息傳給校方…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sendMessage.isPending || !body.trim()}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {sendMessage.isPending ? '送出中…' : '送出'}
        </button>
      </form>
      {sendMessage.isError && <p className="text-sm text-red-600">{apiErrorMessage(sendMessage.error)}</p>}
    </div>
  );
}
