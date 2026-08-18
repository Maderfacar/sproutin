'use client';

import { useNotifications, useMarkNotificationRead } from './hooks';
import { notificationHref, notificationIcon } from './target';
import { relativeTime } from './relativeTime';
import { apiErrorMessage } from '../../lib/api';
import { SurfaceLink } from '../../components/SurfaceLink';
import { Icon } from '../../components/Icon';
import { SkeletonRows } from '../../components/Skeleton';
import type { NotificationView } from '../../lib/types';

function byCreatedDesc(a: NotificationView, b: NotificationView): number {
  return b.createdAt.localeCompare(a.createdAt);
}

// 訊息中心（Human Owner 2026-08-18 定案：把「通知」頁升級成訊息中心，不做四合一）。
//
// 形狀是「收件匣 + 深層頁面」：這裡只負責「今天有什麼新的事」，
// 每一則點進去仍然回到它原本那一頁（公告頁 / 聯絡簿 / 請假），細節與操作都在那邊。
// 出缺勤與行事曆刻意**不**收進來 —— 它們是查得到的紀錄，當成訊息推會天天洗版。
export function NotificationList() {
  const { data, isLoading, isError, error } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) {
    return <SkeletonRows rows={5} />;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="font-serif text-lg text-ink">目前沒有新訊息</p>
        <p className="mt-1 text-sm text-ink-soft">公告、老師的留言與請假結果都會出現在這裡。</p>
      </div>
    );
  }

  const unreadCount = data.filter((n) => n.readAt === null).length;

  return (
    <div>
      {unreadCount > 0 && (
        <p className="mb-2 text-xs font-semibold text-brand-primary">{unreadCount} 則未讀</p>
      )}
      <ul className="border-t border-line">
        {[...data].sort(byCreatedDesc).map((n) => {
          const unread = n.readAt === null;
          const href = notificationHref(n.type, n.payload);

          const inner = (
            <>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  unread ? 'text-brand-primary' : 'text-ink-soft'
                }`}
                style={
                  unread
                    ? { background: 'color-mix(in srgb, var(--brand-primary) 12%, var(--surface))' }
                    : { background: 'rgba(0,0,0,0.03)' }
                }
                aria-hidden
              >
                <Icon name={notificationIcon(n.type)} className="h-[1.125rem] w-[1.125rem]" />
              </span>

              <span className="min-w-0 flex-1">
                <span className={`block leading-snug ${unread ? 'font-semibold text-ink' : 'text-ink'}`}>
                  {n.title}
                </span>
                {/* 副標與時間同一行，擠不下時讓時間掉下去，不折斷副標。 */}
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
                  <span>{n.subtitle}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={n.createdAt}>{relativeTime(n.createdAt)}</time>
                </span>
              </span>

              {unread && (
                <span
                  className="mt-2 h-2 w-2 shrink-0 self-start rounded-full bg-brand-primary"
                  aria-label="未讀"
                />
              )}
            </>
          );

          const rowClass =
            'tappable flex w-full items-start gap-3 border-b border-line px-1 py-3.5 text-left text-sm';

          // 點一則＝看過了 → 直接標已讀（樂觀更新，小圓點立刻消失）再跳頁。
          const onOpen = (): void => {
            if (unread) markRead.mutate(n.id);
          };

          // 沒見過的 type 找不到可以去的地方 → 畫成不可點的一列，
          // 而不是畫成連結卻按了沒反應。
          return (
            <li key={n.id}>
              {href ? (
                <SurfaceLink
                  href={href}
                  onClick={onOpen}
                  className={`${rowClass} hover:bg-black/[0.015]`}
                >
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
