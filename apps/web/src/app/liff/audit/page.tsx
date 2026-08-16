'use client';

import { useState, type FormEvent } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';
import { useAuditLogs } from '../../../features/audit/hooks';
import { AUDIT_RESOURCE_TYPES, AUDIT_RESULT_LABEL } from '../../../features/audit/labels';
import { apiErrorMessage } from '../../../lib/api';
import type { AuditLogFilters, AuditResult } from '../../../lib/types';

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

// 稽核查詢頁（Step 7d;OWNER/ADMIN）。篩選 資源類型 / 操作者 / 日期區間 + 分頁。
export default function AuditPage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [applied, setApplied] = useState<FormState>(EMPTY_FORM);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, error, isFetching } = useAuditLogs(toFilters(applied, offset));

  if (!flags.canViewAudit) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="稽核" />
        <p className="text-sm text-gray-500">此頁僅園長／行政可使用。</p>
      </div>
    );
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
      <PageHeader title="稽核查詢" />

      <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-card border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">資源類型</span>
          <select
            value={form.resourceType}
            onChange={(e) => setForm({ ...form, resourceType: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">全部</option>
            {AUDIT_RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">操作者 User ID</span>
          <input
            type="text"
            value={form.actor}
            onChange={(e) => setForm({ ...form, actor: e.target.value })}
            placeholder="留空 = 全部"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-gray-600">起</span>
            <input
              type="date"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-gray-600">迄</span>
            <input
              type="date"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          查詢
        </button>
      </form>

      {isLoading && <p className="text-sm text-gray-500">載入稽核紀錄中…</p>}
      {isError && <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>}
      {data && data.data.length === 0 && <p className="text-sm text-gray-500">沒有符合條件的稽核紀錄。</p>}

      {data && data.data.length > 0 && (
        <>
          <p className="text-xs text-gray-400">
            共 {total} 筆，顯示 {offset + 1}–{Math.min(offset + PAGE_SIZE, total)}
            {isFetching && '（更新中…）'}
          </p>
          <ul className="flex flex-col gap-2">
            {data.data.map((log) => {
              const result = AUDIT_RESULT_LABEL[log.result as AuditResult] ?? {
                label: log.result,
                className: 'bg-gray-100 text-gray-600',
              };
              return (
                <li key={log.id} className="rounded-card border border-gray-200 bg-white p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{log.action}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${result.className}`}>
                      {result.label}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {log.createdAt.slice(0, 10)} {log.createdAt.slice(11, 16)}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600">
                    {log.resourceType}
                    {log.resourceId ? `｜${log.resourceId}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
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
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              上一頁
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              下一頁
            </button>
          </div>
        </>
      )}
    </div>
  );
}
