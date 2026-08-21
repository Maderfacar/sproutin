'use client';

import { useAnnouncements } from './hooks';
import { apiErrorMessage } from '../../lib/api';
import type { AnnouncementView } from '../../lib/types';
import { Badge, Button, EmptyState, ErrorNotice, SkeletonRows } from '../../components/ui';
import { formatDate } from '../../lib/datetime';

function byCreatedDesc(a: AnnouncementView, b: AnnouncementView): number {
  return b.createdAt.localeCompare(a.createdAt);
}

// 公告列表。日期放在標題**上面**而不是卡片最底下 ——
// 家長打開公告第一個要判斷的是「這則是不是新的、我看過沒」，那應該先講。
// 每一則右下角的「編輯 / 刪除」由呼叫端決定要不要給：
// 誰能動一則公告是園務規則（園長、行政、發布的人自己），不是列表的事 ——
// 列表只負責在被允許時把入口畫出來。
interface AnnouncementListProps {
  /** 這一則現在這個人能不能動。沒給＝整份列表都是唯讀。 */
  canManage?: (announcement: AnnouncementView) => boolean;
  onEdit?: (announcement: AnnouncementView) => void;
  onDelete?: (announcement: AnnouncementView) => void;
}

export function AnnouncementList({ canManage, onEdit, onDelete }: AnnouncementListProps = {}) {
  const { data, isLoading, isError, error, refetch } = useAnnouncements();

  if (isLoading) {
    return <SkeletonRows rows={4} />;
  }
  if (isError) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (!data || data.length === 0) {
    return <EmptyState title="目前沒有公告" hint="園所或班級發布消息時會出現在這裡" />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {[...data].sort(byCreatedDesc).map((a) => (
        <li key={a.id} className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xs tabular-nums text-ink-mute">{formatDate(a.createdAt)}</span>
            <span className="ml-auto">
              <Badge tone={a.scope === 'SCHOOL' ? 'brand' : 'neutral'}>
                {a.scope === 'SCHOOL' ? '全校' : '班級'}
              </Badge>
            </span>
          </div>
          <p className="mt-1.5 font-serif text-lg font-bold leading-snug text-ink">{a.title}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{a.body}</p>
          {canManage?.(a) && (onEdit || onDelete) && (
            <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
              {onEdit && (
                <Button variant="secondary" block={false} onClick={() => onEdit(a)}>
                  編輯
                </Button>
              )}
              {onDelete && (
                <Button variant="danger" block={false} onClick={() => onDelete(a)}>
                  刪除
                </Button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
