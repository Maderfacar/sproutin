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
    return <p className="text-sm text-gray-500">載入公告中…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">目前沒有公告。</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {[...data].sort(byCreatedDesc).map((a) => (
        <li key={a.id} className="rounded-card border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{a.title}</span>
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {a.scope === 'SCHOOL' ? '全校' : '班級'}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{a.body}</p>
          <p className="mt-2 text-xs text-gray-400">{a.createdAt.slice(0, 10)}</p>
        </li>
      ))}
    </ul>
  );
}
