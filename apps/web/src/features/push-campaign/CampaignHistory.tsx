'use client';

import { apiErrorMessage } from '../../lib/api';
import { StatusScreen } from '../../components/StatusScreen';
import { useMyClasses } from '../classes/hooks';
import { useCampaigns } from './hooks';
import { AUDIENCE_LABEL, STATUS_LABEL, TEMPLATES, type CampaignView } from './types';
import { SkeletonRows } from '../../components/Skeleton';

// 送出紀錄。**這一段不是裝飾**：群發送出後無法收回，所以「發過什麼、給誰、幾則」必須留下帳，
// 出事時才回答得出家長的疑問。
export function CampaignHistory() {
  const { data, isLoading, isError, error } = useCampaigns();
  const classes = useMyClasses();

  if (isLoading) {
    return <SkeletonRows rows={4} />;
  }
  if (isError || !data) {
    return <StatusScreen status="error" message={apiErrorMessage(error)} />;
  }

  const className = (id: string | null): string =>
    (classes.data ?? []).find((c) => c.id === id)?.name ?? '該班級';

  return (
    <section className="card p-5">
      <p className="section-title">送出紀錄</p>
      {data.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">還沒有發送過群發訊息。</p>
      ) : (
        <ul className="mt-3">
          {data.map((c) => (
            <li key={c.id} className="border-b border-line py-3 last:border-b-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-ink">{c.title}</span>
                <span className="text-xs text-ink-soft">
                  {TEMPLATES[c.template]?.label ?? c.template} ·{' '}
                  {c.audience === 'CLASS' ? className(c.classId) : AUDIENCE_LABEL[c.audience]}
                </span>
                <span className="ml-auto text-xs text-ink-soft">
                  {new Date(c.createdAt).toLocaleString('zh-TW')}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-soft">{summary(c)}</p>
              {c.failureReason && (
                <p className="mt-1 text-xs leading-relaxed text-red-700">{c.failureReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// 一句話說清楚這一則的結果。**略過的人數要說明原因**，否則園長會以為系統壞了。
function summary(c: CampaignView): string {
  const status = STATUS_LABEL[c.status] ?? c.status;
  if (c.status === 'QUEUED' || c.status === 'SENDING') {
    return `${status} · 預計送出 ${c.recipientCount} 則`;
  }
  const skipped =
    c.skippedCount > 0
      ? ` · 略過 ${c.skippedCount} 位（LINE 不認得該帳號，通常是封鎖了官方帳號或已刪除 LINE）`
      : '';
  return `${status} · 送出 ${c.sentCount} 則${skipped}`;
}
