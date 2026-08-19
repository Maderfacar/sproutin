'use client';

import { apiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/datetime';
import { useMyClasses } from '../classes/hooks';
import { Badge, EmptyState, ErrorNotice, SkeletonRows } from '../../components/ui';
import type { Tone } from '../../components/ui';
import { useCampaigns } from './hooks';
import { AUDIENCE_LABEL, STATUS_LABEL, TEMPLATES, type CampaignView } from './types';

// 送出紀錄。**這一段不是裝飾**：群發送出後無法收回，所以「發過什麼、給誰、幾則」必須留下帳，
// 出事時才回答得出家長的疑問 —— 這也是它現在是整頁主體、編輯器反而收進面板的原因。
//
// 日期放在標題上面：翻這一份清單的第一個問題永遠是「那則是什麼時候送的」。

const STATUS_TONE: Record<string, Tone> = {
  QUEUED: 'wait',
  SENDING: 'wait',
  SENT: 'good',
  FAILED: 'stop',
};

export function CampaignHistory() {
  const { data, isLoading, isError, error, refetch } = useCampaigns();
  // 後台管理頁的例外：只有園長／行政進得來，班級名稱本來就要能對到全校任何一班。
  const { data: classes } = useMyClasses();

  if (isLoading) {
    return <SkeletonRows rows={4} />;
  }
  if (isError || !data) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (data.length === 0) {
    return (
      <EmptyState title="還沒有發過群發訊息" hint="發出去的每一則都會留在這裡，包含送給誰、幾個人收到" />
    );
  }

  const className = (id: string | null): string =>
    (classes ?? []).find((c) => c.id === id)?.name ?? '該班級';

  return (
    <ul className="flex flex-col gap-3">
      {data.map((c) => (
        <li key={c.id} className="rounded-tile border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-2xs tabular-nums text-ink-mute">{formatDateTime(c.createdAt)}</p>
              <p className="mt-0.5 truncate text-base font-bold text-ink">{c.title}</p>
              <p className="mt-0.5 truncate text-2xs text-ink-soft">
                {TEMPLATES[c.template]?.label ?? c.template} ·{' '}
                {c.audience === 'CLASS' ? className(c.classId) : AUDIENCE_LABEL[c.audience]}
              </p>
            </div>
            <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>
              {STATUS_LABEL[c.status] ?? c.status}
            </Badge>
          </div>

          <p className="mt-2.5 text-2xs leading-relaxed text-ink-soft">{summary(c)}</p>

          {c.failureReason && (
            <p className="mt-2 rounded-md2 border border-stop-edge bg-stop-wash px-3 py-2 text-2xs leading-relaxed text-stop-text">
              {c.failureReason}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

// 一句話說清楚這一則的結果。**略過的人數要說明原因**，否則園長會以為系統壞了。
function summary(c: CampaignView): string {
  if (c.status === 'QUEUED' || c.status === 'SENDING') {
    return `預計送出 ${c.recipientCount} 則`;
  }
  const skipped =
    c.skippedCount > 0
      ? ` · 略過 ${c.skippedCount} 位（LINE 不認得該帳號，通常是封鎖了官方帳號或已刪除 LINE）`
      : '';
  return `送出 ${c.sentCount} 則${skipped}`;
}
