'use client';

import { Fragment, useState, type FormEvent } from 'react';
import { useMessages, useSendMessage, useMarkMessageRead } from './hooks';
import { useSession } from '../../lib/session';
import { apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { ROLE_LABEL } from '../../lib/roleLabels';
import { RELATION_LABEL } from '../people/hooks';
import type { MessageView } from '../../lib/types';
import { EmptyState, ErrorNotice, SkeletonLines } from '../../components/ui';
import { formatDate, formatTime, schoolPartsOf, schoolWeekday } from '../../lib/datetime';

function byCreatedAsc(a: MessageView, b: MessageView): number {
  return a.createdAt.localeCompare(b.createdAt);
}

// 「陳美玲 · 母親」。一個學生的對話串裡可能同時有父、母、導師、園長 ——
// 只有時間的話，三個人講的話長得一模一樣。
// 身分翻不出來時只顯示名字，不硬掰一個稱呼（後端保證兩者至少有一個有值，這是保險）。
function senderLabel(msg: MessageView): string {
  const role = msg.senderRelation
    ? RELATION_LABEL[msg.senderRelation]
    : msg.senderRole
      ? ROLE_LABEL[msg.senderRole]
      : null;
  return role ? `${msg.senderName} · ${role}` : msg.senderName;
}

function dayLabel(iso: string): string {
  const parts = schoolPartsOf(iso);
  if (!parts) return '';
  const week = ['日', '一', '二', '三', '四', '五', '六'][schoolWeekday(iso)];
  return `${parts.month}月 ${parts.day}日 · 週${week}`;
}

function timeLabel(iso: string): string {
  return formatTime(iso);
}

// 訊息串（Student-centered，雙向，清葉）。自己靠右（森綠）、校方靠左（柔和）;
// 依日期分隔;未讀可點標已讀;底部 pill 輸入 + 圓形送出。
//
// 對話泡泡刻意**不**進元件庫：它只有這一頁在用，而元件庫的規矩是
// 「要加第 16 個之前，先確認前 15 個真的湊不出來」—— 一個只有一個呼叫端的元件，
// 抽出去只是多一個要對齊的地方。空狀態與錯誤則一律用元件庫的那兩個。
export function MessageThread({ studentId }: { studentId: string }) {
  const { user } = useSession();
  const { data, isLoading, isError, error, refetch } = useMessages(studentId);
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
      {isLoading && <SkeletonLines lines={3} />}
      {isError && <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />}
      {data && data.length === 0 && (
        <EmptyState title="還沒有訊息" hint="在下面打一句話，老師就會收到" />
      )}

      {sorted.length > 0 && (
        <div className="flex flex-col gap-3.5">
          {sorted.map((msg, i) => {
            const mine = msg.senderId === user.id;
            const showUnread = !mine && !msg.isRead;
            const prev = i > 0 ? (sorted[i - 1] ?? null) : null;
            // 以台灣時間分日：晚上 8 點之後（UTC 已跨日）的訊息若照 UTC 切，會被歸到隔天。
            const prevDay = prev ? formatDate(prev.createdAt) : null;
            const showDay = formatDate(msg.createdAt) !== prevDay;
            // 同一個人連著講好幾句時只在第一句標名字 —— 每句都標，一來一往幾輪就滿版都是名字。
            // 換日期就重新標（隔了一天再看，記得上一句是誰講的才怪）。
            const showSender = !mine && (showDay || prev?.senderId !== msg.senderId);
            return (
              <Fragment key={msg.id}>
                {showDay && (
                  <div className="flex items-center gap-3 py-1 text-2xs font-bold tracking-[0.1em] text-ink-soft">
                    <span className="h-px flex-1 bg-line" />
                    {dayLabel(msg.createdAt)}
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {showSender && (
                    <div className="mb-1.5 flex items-center gap-1.5">
                      {/* 校方實心、家長外框。刻意不給家長另一個顏色 ——
                          品牌色是每個園所自己設定的，第二個顏色不一定跟它搭。 */}
                      <span
                        aria-hidden
                        className={`flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full text-2xs font-bold ${
                          msg.senderRelation
                            ? 'border border-line bg-surface text-ink-soft'
                            : 'text-brand-contrast'
                        }`}
                        style={
                          msg.senderRelation ? undefined : { background: 'var(--brand-primary)' }
                        }
                      >
                        {msg.senderName.charAt(0)}
                      </span>
                      <span className="text-2xs font-semibold text-ink-soft">
                        {senderLabel(msg)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] px-4 py-2.5 text-sm leading-relaxed ${
                      mine
                        ? 'rounded-[18px_4px_18px_18px] bg-brand-primary text-brand-contrast'
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
                  <div className="mt-1.5 flex items-center gap-2 px-1 text-2xs text-ink-soft">
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

      {/* 送出中的泡泡：按下去那一刻就先出現，不等伺服器回來（B1「按下去要立刻有反應」）。
          刻意不把假資料塞進快取 —— 伺服器才知道這則訊息的 id 與時間;
          這裡畫的是「這則正在送」這個事實本身，成功後重取就會換成真的那一則。 */}
      {sendMessage.isPending && sendMessage.variables && (
        <div className="flex justify-end">
          <div className="max-w-[78%] rounded-[18px_4px_18px_18px] bg-brand-primary px-3.5 py-2 text-sm text-brand-contrast opacity-70">
            <p className="whitespace-pre-wrap">{sendMessage.variables.body}</p>
            <p className="mt-1 text-2xs text-brand-contrast opacity-80">送出中…</p>
          </div>
        </div>
      )}

      {/* 送不出去要講，不能安靜地把使用者打的字留在框裡讓他以為送出了。
          這句話原本在畫面上出現兩次（這裡一次、輸入框下面又一次）—— 同一件壞消息講兩遍
          會讓人以為壞了兩次。留這一則就好，它就在最後一顆泡泡下面。 */}
      {sendMessage.isError && (
        <ErrorNotice
          message={`${apiErrorMessage(sendMessage.error)} 訊息還留在下面，可以再送一次。`}
        />
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary text-brand-contrast transition hover:opacity-90 disabled:opacity-40"
        >
          <Icon name="send" className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
