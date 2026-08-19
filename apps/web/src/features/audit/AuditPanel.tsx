'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { apiErrorMessage } from '../../lib/api';
import type { AuditLogFilters, AuditResult } from '../../lib/types';
import { useAuditLogs } from './hooks';
import { AUDIT_RESOURCE_TYPES, AUDIT_RESULT_LABEL, actorText } from './labels';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  SectionHead,
  Sheet,
  SkeletonRows,
} from '../../components/ui';
import { Icon } from '../../components/Icon';
import { formatDateTime } from '../../lib/datetime';

const PAGE_SIZE = 50;

interface FormState {
  resourceType: string;
  actor: string;
  from: string;
  to: string;
}

const EMPTY_FORM: FormState = { resourceType: '', actor: '', from: '', to: '' };

function toFilters(form: FormState, offset: number): AuditLogFilters {
  return {
    resourceType: form.resourceType || undefined,
    actor: form.actor.trim() || undefined,
    from: form.from ? `${form.from}T00:00:00.000Z` : undefined,
    to: form.to ? `${form.to}T23:59:59.999Z` : undefined,
    limit: PAGE_SIZE,
    offset,
  };
}

// 目前套用了哪些條件，用一句話講。沒有條件時說「全部」，不要留空。
function appliedLabel(f: FormState): string {
  const parts: string[] = [];
  if (f.resourceType) parts.push(f.resourceType);
  if (f.actor.trim()) parts.push('指定操作者');
  if (f.from || f.to) parts.push(`${f.from || '最早'} ～ ${f.to || '今天'}`);
  return parts.length > 0 ? parts.join(' · ') : '全部紀錄';
}

const RESULT_TONE: Record<string, 'good' | 'stop' | 'neutral'> = {
  SUCCESS: 'good',
  FAILURE: 'stop',
  DENIED: 'stop',
};

// 稽核查詢（OWNER/ADMIN）：篩選 資源類型 / 操作者 / 日期區間 + 分頁。
// 桌面版 /admin/audit 與手機版 /liff/audit 共用這一份（docs/04 §3b）。
//
// 清葉加厚（2026-08-20）：查詢條件收進底部面板。
// 進這一頁多數時候是「翻一下最近發生什麼」，不是來填四個欄位的；
// 條件常駐在最上面等於每次都要先捲過它才看得到紀錄。
// 目前套用了什麼條件用一句話寫在標題旁邊，不會因為收起來就不知道自己在看什麼。
export function AuditPanel() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [applied, setApplied] = useState<FormState>(EMPTY_FORM);
  const [offset, setOffset] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data, isLoading, isError, error, isFetching, refetch } = useAuditLogs(
    toFilters(applied, offset),
  );

  if (!flags.canViewAudit) {
    return <EmptyState title="這一頁只有園長或行政人員看得到" />;
  }

  function search(): void {
    setOffset(0);
    setApplied(form);
    setFilterOpen(false);
  }

  // 從某一列直接套用「只看這個人」。表單與已套用的條件一起更新，
  // 否則畫面上的欄位會跟實際的查詢條件對不起來。
  function filterByActor(actorUserId: string): void {
    const next = { ...form, actor: actorUserId };
    setForm(next);
    setOffset(0);
    setApplied(next);
  }

  function clearAll(): void {
    setForm(EMPTY_FORM);
    setApplied(EMPTY_FORM);
    setOffset(0);
    setFilterOpen(false);
  }

  const total = data?.meta.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;
  const hasFilter = JSON.stringify(applied) !== JSON.stringify(EMPTY_FORM);

  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionHead
          title="操作紀錄"
          description="誰在什麼時候做了什麼。紀錄只能新增，不能修改或刪除"
          weight="review"
          trailing={
            <Button variant="secondary" onClick={() => setFilterOpen(true)}>
              篩選
              <Icon name="chev" className="h-4 w-4 rotate-90" />
            </Button>
          }
        />

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone={hasFilter ? 'brand' : 'neutral'}>{appliedLabel(applied)}</Badge>
          {hasFilter && (
            <Button variant="text" onClick={clearAll}>
              清掉條件
            </Button>
          )}
          {data && data.data.length > 0 && (
            <span className="ml-auto text-2xs tabular-nums text-ink-mute">
              共 {total} 筆，顯示 {offset + 1}–{Math.min(offset + PAGE_SIZE, total)}
              {isFetching && '（更新中…）'}
            </span>
          )}
        </div>

        {isLoading && <SkeletonRows rows={5} />}
        {isError && <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />}
        {data && data.data.length === 0 && (
          <EmptyState
            title={hasFilter ? '這個條件下沒有紀錄' : '還沒有任何操作紀錄'}
            hint={hasFilter ? '把條件放寬一點再試' : undefined}
          />
        )}

        {data && data.data.length > 0 && (
          <>
            <ul className="flex flex-col gap-2">
              {data.data.map((log) => {
                const result = AUDIT_RESULT_LABEL[log.result as AuditResult] ?? {
                  label: log.result,
                };
                const actorId = log.actorUserId;
                return (
                  <li
                    key={log.id}
                    className="rounded-card border border-line bg-surface p-3.5 text-sm"
                  >
                    {/* flex-wrap：動作代碼 + 結果 + 時間在放大字級的窄手機上擠不下同一行，
                        讓時間整段掉到下一行，比把動作代碼折斷好讀。 */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-bold text-ink">{log.action}</span>
                      <Badge tone={RESULT_TONE[log.result] ?? 'neutral'}>{result.label}</Badge>
                      <span className="ml-auto text-2xs tabular-nums text-ink-mute">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-ink-soft">
                      {log.resourceType}
                      {log.resourceId ? `｜${log.resourceId}` : ''}
                    </p>
                    <p className="mt-0.5 text-2xs text-ink-soft">
                      操作者：{actorText(log.actorName, actorId, log.actorRole)}
                      {actorId && (
                        // 「操作者」欄位要填的是一串沒人記得住的 ID。從這裡按一下就填好，
                        // 不必為了追一個人的操作而去別的頁面複製 ID。
                        <button
                          type="button"
                          onClick={() => filterByActor(actorId)}
                          className="tappable ml-2 font-semibold text-brand-primary underline underline-offset-2"
                        >
                          只看這個人
                        </button>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="secondary"
                block={false}
                disabled={!canPrev}
                onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}
              >
                上一頁
              </Button>
              <Button
                variant="secondary"
                block={false}
                disabled={!canNext}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="ml-auto"
              >
                下一頁
              </Button>
            </div>
          </>
        )}
      </section>

      <Sheet open={filterOpen} title="篩選條件" onClose={() => setFilterOpen(false)}>
        <div className="flex flex-col gap-4">
          <Field label="資源類型" hint="留空就是全部">
            <select
              aria-label="資源類型"
              value={form.resourceType}
              onChange={(e) => setForm({ ...form, resourceType: e.target.value })}
              className="field"
            >
              <option value="">全部</option>
              {AUDIT_RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="操作者" hint="不必自己打 —— 從紀錄那一列按「只看這個人」會自動帶入">
            <input
              type="text"
              value={form.actor}
              onChange={(e) => setForm({ ...form, actor: e.target.value })}
              placeholder="留空 = 全部"
              className="field"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="從哪一天">
              <input
                type="date"
                value={form.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
                className="field tabular-nums"
              />
            </Field>
            <Field label="到哪一天">
              <input
                type="date"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                className="field tabular-nums"
              />
            </Field>
          </div>

          <Button variant="primary" onClick={search}>
            查詢
          </Button>
          <Button variant="secondary" onClick={clearAll}>
            清掉全部條件
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
