'use client';

import { useAnnouncements } from './hooks';
import { apiErrorMessage } from '../../lib/api';
import type { AnnouncementView } from '../../lib/types';

function byCreatedDesc(a: AnnouncementView, b: AnnouncementView): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export function AnnouncementList() {
  const { data, isLoading, isError, error } = useAnnouncements();

  if (isLoading) {
    return <p className="text-sm text-ink-soft">載入公告中…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-ink-soft">目前沒有公告。</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {[...data].sort(byCreatedDesc).map((a) => (
        <li key={a.id} className="card p-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink">{a.title}</span>
            <span
              className="chip ml-auto"
              style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, #ffffff)' }}
            >
              {a.scope === 'SCHOOL' ? '全校' : '班級'}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{a.body}</p>
          <p className="mt-2 text-xs text-ink-soft">{a.createdAt.slice(0, 10)}</p>
        </li>
      ))}
    </ul>
  );
}
