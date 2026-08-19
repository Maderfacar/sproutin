'use client';

import { useNotifications, useMarkNotificationRead } from './hooks';
import { notificationHref, notificationIcon } from './target';
import { relativeTime } from './relativeTime';
import { apiErrorMessage } from '../../lib/api';
import { SurfaceLink } from '../../components/SurfaceLink';
import { Icon } from '../../components/Icon';
import { Badge, EmptyState, ErrorNotice, SkeletonRows, TONE } from '../../components/ui';
import type { NotificationView } from '../../lib/types';

function byCreatedDesc(a: NotificationView, b: NotificationView): number {
  return b.createdAt.localeCompare(a.createdAt);
}

// 訊息中心（Human Owner 2026-08-18 定案：把「通知」頁升級成訊息中心，不做四合一）。
//
// 形狀是「收件匣 + 深層頁面」：這裡只負責「今天有什麼新的事」，
// 每一則點進去仍然回到它原本那一頁（公告頁 / 聯絡簿 / 請假），細節與操作都在那邊。
// 出缺勤與行事曆刻意**不**收進來 —— 它們是查得到的紀錄，當成訊息推會天天洗版。
//
// 清葉加厚（2026-08-20）：這一頁在四批裡都沒被點到（家長 6 頁的清單裡沒有它），
// 所以顏色是自己 inline style 混出來的、空狀態與錯誤各寫一份。現在改用元件庫。
// **未讀那一則要整列都看得出來**，不是只有右邊一個小圓點 ——
// 收件匣的價值在於「哪幾則是新的」一眼掃得出來。
export function NotificationList() {
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) {
    return <SkeletonRows rows={5} />;
  }
  if (isError) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="目前沒有新訊息"
        hint="公告、老師的留言與請假結果都會出現在這裡"
      />
    );
  }

  const unreadCount = data.filter((n) => n.readAt === null).length;

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 && (
        <div>
          <Badge tone="stop" count>
            {unreadCount} 則未讀
          </Badge>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {[...data].sort(byCreatedDesc).map((n) => {
          const unread = n.readAt === null;
          const href = notificationHref(n.type, n.payload);

          const inner = (
            <>
              <span
                aria-hidden
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md2 border ${
                  unread ? TONE.brand.block : TONE.neutral.block
                }`}
              >
                <Icon name={notificationIcon(n.type)} className="h-5 w-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block leading-snug ${unread ? 'text-base font-bold text-ink' : 'text-base text-ink-soft'}`}
                >
                  {n.title}
                </span>
                {/* 副標與時間同一行，擠不下時讓時間掉下去，不折斷副標。 */}
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-ink-mute">
                  <span>{n.subtitle}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={n.createdAt} className="tabular-nums">
                    {relativeTime(n.createdAt)}
                  </time>
                </span>
              </span>

              {unread && (
                <span
                  aria-label="未讀"
                  className="mt-1 h-2.5 w-2.5 shrink-0 self-start rounded-full bg-stop-text"
                />
              )}
            </>
          );

          // 未讀整列加厚（實線 + 白底），讀過的退成細線 —— 一眼就掃得出哪幾則是新的。
          const rowClass = `tappable flex min-h-touch w-full items-center gap-3 rounded-card border p-3.5 text-left ${
            unread ? 'border-line-strong bg-surface shadow-soft' : 'border-line bg-surface/60'
          }`;

          // 點一則＝看過了 → 直接標已讀（樂觀更新，小圓點立刻消失）再跳頁。
          const onOpen = (): void => {
            if (unread) markRead.mutate(n.id);
          };

          // 沒見過的 type 找不到可以去的地方 → 畫成不可點的一列，
          // 而不是畫成連結卻按了沒反應。
          return (
            <li key={n.id}>
              {href ? (
                <SurfaceLink href={href} onClick={onOpen} className={rowClass}>
                  {inner}
                </SurfaceLink>
              ) : (
                <button type="button" onClick={onOpen} disabled={!unread} className={rowClass}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
