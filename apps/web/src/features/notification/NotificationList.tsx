'use client';

import { useNotifications, useMarkNotificationRead } from './hooks';
import { notificationLabel } from './labels';
import { apiErrorMessage } from '../../lib/api';
import type { NotificationView } from '../../lib/types';

function byCreatedDesc(a: NotificationView, b: NotificationView): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export function NotificationList() {
  const { data, isLoading, isError, error } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) {
    return <p className="text-sm text-gray-500">載入通知中…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">目前沒有通知。</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {[...data].sort(byCreatedDesc).map((n) => {
        const unread = n.readAt === null;
        return (
          <li
            key={n.id}
            className={`rounded-card border p-4 ${
              unread ? 'border-brand-primary/40 bg-brand-secondary/10' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {unread && <span className="h-2 w-2 rounded-full bg-brand-primary" aria-label="未讀" />}
              <span className="font-medium text-gray-900">{notificationLabel(n.type)}</span>
              <span className="ml-auto text-xs text-gray-400">{n.createdAt.slice(0, 10)}</span>
            </div>
            {unread && (
              <button
                type="button"
                onClick={() => markRead.mutate(n.id)}
                disabled={markRead.isPending}
                className="mt-2 text-sm text-brand-primary disabled:opacity-50"
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
