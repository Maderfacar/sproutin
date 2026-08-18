'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { apiErrorMessage } from '../../lib/api';
import { useAttendance } from '../attendance/hooks';
import { MessageThread } from '../message/MessageThread';
import type { BookEntryView } from '../../lib/types';
import {
  MEAL_LABEL,
  MOOD_LABEL,
  NAP_LABEL,
  PICKUP_LABEL,
  SYMPTOM_LABEL,
  TOILET_LABEL,
} from './labels';
import { hasContent, useStudentBook } from './hooks';
import { schoolDayKeyIso, schoolToday } from '../../lib/datetime';
import { HealthEditor } from './HealthEditor';
import { SkeletonCards } from '../../components/Skeleton';

const MS_PER_DAY = 86_400_000;
const STRIP_DAYS = 7;

function shift(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * MS_PER_DAY).toISOString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 · 週${week}`;
}

const ATTENDANCE_TEXT: Record<string, string> = {
  PRESENT: '已到校',
  LATE: '已到校（遲到）',
  LEAVE: '今日請假',
  ABSENT: '未到校',
};

interface StudentBookViewProps {
  studentId: string;
  canEdit: boolean; // 校方且在可填寫期間內才顯示健康/留言的編輯區
}

// 學生聯絡簿：**上半部是當日狀態，下半部是連續的親師對話**。
// 對話刻意不依日期切割 —— 切碎會看不懂前因後果；翻日期只換上半部的狀態。
export function StudentBookView({ studentId, canEdit }: StudentBookViewProps) {
  const [selected, setSelected] = useState(() => schoolDayKeyIso());

  const from = shift(selected, -(STRIP_DAYS - 1));
  const { data: entries, isLoading, isError, error } = useStudentBook(studentId, { from, to: selected });
  const { data: attendance } = useAttendance(studentId);

  const byDate = new Map((entries ?? []).map((e) => [e.date.slice(0, 10), e]));
  const entry = byDate.get(selected.slice(0, 10));
  const attendanceStatus = attendance?.find((a) => a.date.slice(0, 10) === selected.slice(0, 10))?.status;

  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => shift(from, i));
  const isToday = selected.slice(0, 10) === schoolToday();

  return (
    <div className="flex flex-col gap-5">
      {/* 日期橫條：近 7 天一點就到，再往前用左右鍵翻 */}
      <section className="flex items-center gap-2">
        <button
          type="button"
          aria-label="上一週"
          onClick={() => setSelected(shift(selected, -STRIP_DAYS))}
          className="shrink-0 rotate-180 text-ink-soft"
        >
          <Icon name="chev" className="h-4 w-4" />
        </button>
        <div className="flex flex-1 justify-between gap-1">
          {strip.map((iso) => {
            const key = iso.slice(0, 10);
            const active = key === selected.slice(0, 10);
            const filled = byDate.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(iso)}
                className={`flex flex-1 flex-col items-center rounded-md2 py-1.5 text-xs transition ${
                  active ? 'bg-brand-primary text-white' : 'text-ink-soft'
                }`}
              >
                <span>{['日', '一', '二', '三', '四', '五', '六'][new Date(iso).getUTCDay()]}</span>
                <span className="font-semibold tabular-nums">{new Date(iso).getUTCDate()}</span>
                <span
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    filled ? (active ? 'bg-white' : 'bg-brand-primary') : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="下一週"
          disabled={isToday}
          onClick={() => setSelected(shift(selected, STRIP_DAYS))}
          className="shrink-0 text-ink-soft disabled:opacity-30"
        >
          <Icon name="chev" className="h-4 w-4" />
        </button>
      </section>

      {/* 當日狀態 */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">{dayLabel(selected)}</p>
          {attendanceStatus && (
            <span className="text-xs text-ink-soft">{ATTENDANCE_TEXT[attendanceStatus]}</span>
          )}
        </div>

        {isLoading && <div className="mt-3"><SkeletonCards cards={2} /></div>}
        {isError && <p className="mt-3 text-sm text-red-600">{apiErrorMessage(error)}</p>}

        {!isLoading && !hasContent(entry) && (
          <p className="mt-3 text-sm text-ink-soft">
            {attendanceStatus === 'LEAVE'
              ? '這天請假，沒有當日記錄。'
              : '這天還沒有記錄。老師記錄後會出現在這裡。'}
          </p>
        )}

        {entry && hasContent(entry) && <BookEntryDetail entry={entry} />}

        {entry && hasContent(entry) && !entry.publishedAt && (
          <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
            老師今天還在記錄中，放學前會送出。
          </p>
        )}
      </section>

      {canEdit && <HealthEditor studentId={studentId} dateIso={selected} entry={entry} />}

      {/* 親師對話：連續、不依日期切割 */}
      <section className="flex flex-col gap-3">
        <h2 className="section-title">親師對話</h2>
        <MessageThread studentId={studentId} />
      </section>
    </div>
  );
}

function BookEntryDetail({ entry }: { entry: BookEntryView }) {
  const rows: { label: string; value: string }[] = [];
  if (entry.arrivalTime) rows.push({ label: '到校', value: entry.arrivalTime });
  if (entry.lunch) rows.push({ label: '午餐', value: MEAL_LABEL[entry.lunch] });
  if (entry.snack) rows.push({ label: '點心', value: MEAL_LABEL[entry.snack] });
  if (entry.nap) rows.push({ label: '午睡', value: NAP_LABEL[entry.nap] });
  if (entry.toilet) rows.push({ label: '如廁', value: TOILET_LABEL[entry.toilet] });
  if (entry.mood) rows.push({ label: '心情', value: MOOD_LABEL[entry.mood] });
  if (entry.pickup) rows.push({ label: '接送', value: PICKUP_LABEL[entry.pickup] });

  return (
    <>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 border-t border-line pt-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline gap-2 py-1.5">
            <dt className="text-xs text-ink-soft">{r.label}</dt>
            <dd className="text-sm font-semibold text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>

      <HealthSummary entry={entry} />

      {entry.teacherNote && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="eyebrow">今日老師記錄</p>
          <p className="mt-1.5 whitespace-pre-wrap font-serif text-base leading-relaxed text-ink">
            {entry.teacherNote}
          </p>
        </div>
      )}
    </>
  );
}

// 健康只在「有東西可講」時才出現，避免每天都顯示「無異狀」變成雜訊。
function HealthSummary({ entry }: { entry: BookEntryView }) {
  const hasHealth = entry.symptoms.length > 0 || entry.temperature !== null;
  if (!hasHealth) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <span className="text-xs text-ink-soft">健康</span>
      {entry.temperature !== null && (
        <span className="text-sm font-semibold text-ink tabular-nums">
          {entry.temperature.toFixed(1)}°C
        </span>
      )}
      {entry.symptoms.map((s) => (
        <span key={s} className="chip border border-amber-300 bg-amber-50 text-amber-800">
          {SYMPTOM_LABEL[s]}
        </span>
      ))}
    </div>
  );
}
