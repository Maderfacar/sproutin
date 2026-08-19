'use client';

import { useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { apiErrorMessage } from '../../lib/api';
import type { StudentView } from '../../lib/auth';
import type { BookEntryView, PublishBookBody } from '../../lib/types';
import { SYMPTOM_LABEL } from './labels';
import { hasContent, needsHealthAttention } from './hooks';
import { Button } from '../../components/ui';

interface PublishPanelProps {
  classId: string;
  dateIso: string;
  students: StudentView[];
  entries: Map<string, BookEntryView>;
  publish: UseMutationResult<{ published: number; pushed: number }, Error, PublishBookBody>;
}

// 放學前的收尾：一鍵送出全班。
// **系統幫老師判斷誰需要即時通知**（體溫偏高或有症狀），老師只回答要或不要 ——
// 若要老師自己判斷「這算不算緊急」，就是每天多想 25 次，而且會漏。
// 其餘學生一律只發 App 內通知、不推 LINE（費用與打擾都不成比例）。
export function PublishPanel({ classId, dateIso, students, entries, publish }: PublishPanelProps) {
  const flagged = students.filter((s) => {
    const entry = entries.get(s.id);
    return entry ? needsHealthAttention(entry) && !entry.publishedAt : false;
  });
  const [pushIds, setPushIds] = useState<string[] | null>(null);
  const selected = pushIds ?? flagged.map((s) => s.id);

  const readyCount = students.filter((s) => {
    const entry = entries.get(s.id);
    return hasContent(entry) && !entry?.publishedAt;
  }).length;
  const publishedCount = students.filter((s) => Boolean(entries.get(s.id)?.publishedAt)).length;

  function toggle(studentId: string): void {
    const next = selected.includes(studentId)
      ? selected.filter((id) => id !== studentId)
      : [...selected, studentId];
    setPushIds(next);
  }

  return (
    <section className="flex flex-col gap-3 rounded-tile border border-line-strong bg-surface shadow-soft p-5">
      <div className="flex items-center gap-3">
        <Icon name="check" className="h-5 w-5 shrink-0 text-brand-primary" />
        <div className="flex-1">
          <p className="text-sm font-bold text-ink">{readyCount} 位待送出</p>
          <p className="text-xs text-ink-soft">已送出 {publishedCount} 位</p>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="rounded-md2 border border-note-edge bg-note-wash p-3">
          <p className="text-sm font-bold text-note-text">
            {flagged.length} 位今日健康需注意，要立刻用 LINE 通知家長嗎？
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {flagged.map((s) => {
              const entry = entries.get(s.id)!;
              const detail = [
                entry.temperature !== null ? `${entry.temperature.toFixed(1)}°C` : null,
                ...entry.symptoms.map((sym) => SYMPTOM_LABEL[sym]),
              ]
                .filter(Boolean)
                .join('、');
              return (
                <li key={s.id}>
                  <label className="flex min-h-touch items-center gap-2 text-sm text-note-text">
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={() => toggle(s.id)}
                      className="h-4 w-4"
                    />
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs">{detail}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-2xs text-note-text">未勾選者與其餘學生只會收到 App 內通知。</p>
        </div>
      )}

      <Button
        variant="primary"
        disabled={publish.isPending || readyCount === 0}
        onClick={() =>
          publish.mutate(
            { classId, date: dateIso, pushStudentIds: selected },
            { onSuccess: () => setPushIds(null) },
          )
        }
      >
        {publish.isPending ? '送出中…' : '送出全班聯絡簿'}
      </Button>

      {publish.isSuccess && (
        <p className="text-sm text-brand-primary">
          已送出 {publish.data.published} 位
          {publish.data.pushed > 0 ? `，其中 ${publish.data.pushed} 位已 LINE 通知` : ''}。
        </p>
      )}
      {publish.isError && <p className="text-sm text-stop-text">{apiErrorMessage(publish.error)}</p>}
    </section>
  );
}
