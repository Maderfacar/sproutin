'use client';

import { useState, type FormEvent } from 'react';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { apiErrorMessage } from '../../lib/api';
import type { AuditLogFilters, AuditResult } from '../../lib/types';
import { useAuditLogs } from './hooks';
import { AUDIT_RESOURCE_TYPES, AUDIT_RESULT_LABEL } from './labels';

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

// 稽核查詢（OWNER/ADMIN）：篩選 資源類型 / 操作者 / 日期區間 + 分頁。
// 桌面版 /admin/audit 與手機版 /liff/audit 共用這一份（docs/04 §3b）。
export function AuditPanel() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [applied, setApplied] = useState<FormState>(EMPTY_FORM);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, error, isFetching } = useAuditLogs(toFilters(applied, offset));

  if (!flags.canViewAudit) {
    return <p className="text-sm text-ink-soft">此頁僅園長／行政可使用。</p>;
  }

  function handleSearch(e: FormEvent): void {
    e.preventDefault();
    setOffset(0);
    setApplied(form);
  }

  const total = data?.meta.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div className="flex flex-col gap-5">
      {/* 桌面上四個欄位一排放得下，手機上一欄一列 —— 同一份欄位，只是排法隨寬度變。 */}
      <form onSubmit={handleSearch} className="card flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="field-label sm:flex-1">
            <span>資源類型</span>
            <select
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
          </label>

          <label className="field-label sm:flex-1">
            <span>操作者 User ID</span>
            <input
              type="text"
              value={form.actor}
              onChange={(e) => setForm({ ...form, actor: e.target.value })}
              placeholder="留空 = 全部"
              className="field"
            />
          </label>

          <label className="field-label sm:flex-1">
            <span>起</span>
            <input
              type="date"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
              className="field"
            />
          </label>

          <label className="field-label sm:flex-1">
            <span>迄</span>
            <input
              type="date"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              className="field"
            />
          </label>
        </div>

        <button type="submit" className="btn-primary sm:self-start sm:px-8">
          查詢
        </button>
      </form>

      {isLoading && <p className="text-sm text-ink-soft">載入稽核紀錄中…</p>}
      {isError && <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>}
      {data && data.data.length === 0 && (
        <p className="text-sm text-ink-soft">沒有符合條件的稽核紀錄。</p>
      )}

      {data && data.data.length > 0 && (
        <>
          <p className="text-xs text-ink-soft">
            共 {total} 筆，顯示 {offset + 1}–{Math.min(offset + PAGE_SIZE, total)}
            {isFetching && '（更新中…）'}
          </p>
          <ul className="flex flex-col gap-2">
            {data.data.map((log) => {
              const result = AUDIT_RESULT_LABEL[log.result as AuditResult] ?? {
                label: log.result,
                className: 'bg-black/5 text-ink-soft',
              };
              return (
                <li key={log.id} className="card p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{log.action}</span>
                    <span className={`chip ${result.className}`}>{result.label}</span>
                    <span className="ml-auto text-xs text-ink-soft">
                      {log.createdAt.slice(0, 10)} {log.createdAt.slice(11, 16)}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-soft">
                    {log.resourceType}
                    {log.resourceId ? `｜${log.resourceId}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    操作者：{log.actorRole ?? '系統'}
                    {log.actorUserId ? `（${log.actorUserId}）` : ''}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}
              className="btn-secondary text-sm"
            >
              上一頁
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="btn-secondary text-sm"
            >
              下一頁
            </button>
          </div>
        </>
      )}
    </div>
  );
}
