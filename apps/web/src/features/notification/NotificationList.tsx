'use client';

import { useNotifications, useMarkNotificationRead } from './hooks';
import { notificationLabel } from './labels';
import { apiErrorMessage } from '../../lib/api';
import type { NotificationView } from '../../lib/types';

function byCreatedDesc(a: NotificationView, b: NotificationView): number {
  return b.createdAt.localeCompare(a.createdAt);
}

// ISO（UTC）→ 使用者本地時間 YYYY-MM-DD HH:MM:SS（顯示到秒）。
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function NotificationList() {
  const { data, isLoading, isError, error } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) {
    return <p className="text-sm text-ink-soft">載入通知中…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-ink-soft">目前沒有通知。</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {[...data].sort(byCreatedDesc).map((n) => {
        const unread = n.readAt === null;
        return (
          <li
            key={n.id}
            className="card p-4"
            style={
              unread
                ? { background: 'color-mix(in srgb, var(--brand-primary) 8%, var(--surface))' }
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-primary" aria-label="未讀" />}
              <span className="font-bold text-ink">{notificationLabel(n.type)}</span>
              <span className="ml-auto text-xs text-ink-soft">{formatDateTime(n.createdAt)}</span>
            </div>
            {unread && (
              <button
                type="button"
                onClick={() => markRead.mutate(n.id)}
                disabled={markRead.isPending}
                className="mt-2 text-sm font-medium text-brand-primary disabled:opacity-50"
              >
                標為已讀
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
