'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { apiErrorMessage } from '../../lib/api';
import { useAttendance } from '../attendance/hooks';
import { MessageThread } from '../message/MessageThread';
import type { AttendanceStatus, BookEntryView } from '../../lib/types';
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
import {
  Badge,
  ErrorNotice,
  SectionHead,
  SkeletonCards,
  StateCard,
  type Tone,
} from '../../components/ui';

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

// 當日狀態卡上的那句答案。用家長會講的話，不用系統的狀態名。
const ANSWER: Record<AttendanceStatus, { headline: string; tone: Tone }> = {
  PRESENT: { headline: '有來上學', tone: 'good' },
  LATE: { headline: '有來上學', tone: 'note' },
  LEAVE: { headline: '這天請假', tone: 'wait' },
  ABSENT: { headline: '這天沒到校', tone: 'stop' },
};

interface StudentBookViewProps {
  studentId: string;
  canEdit: boolean; // 校方且在可填寫期間內才顯示健康/留言的編輯區
}

// 學生聯絡簿：**上半部是當日狀態，下半部是連續的親師對話**。
// 對話刻意不依日期切割 —— 切碎會看不懂前因後果；翻日期只換上半部的狀態。
//
// 清葉加厚（2026-08-20）：當日狀態從「一行小灰字」改成整張狀態卡 ——
// 家長翻到某一天想知道的第一件事就是那天有沒有來、過得如何，那應該是整頁最大的字。
export function StudentBookView({ studentId, canEdit }: StudentBookViewProps) {
  const [selected, setSelected] = useState(() => schoolDayKeyIso());

  const from = shift(selected, -(STRIP_DAYS - 1));
  const { data: entries, isLoading, isError, error, refetch } = useStudentBook(studentId, {
    from,
    to: selected,
  });
  const { data: attendance } = useAttendance(studentId);

  const byDate = new Map((entries ?? []).map((e) => [e.date.slice(0, 10), e]));
  const entry = byDate.get(selected.slice(0, 10));
  const status = attendance?.find((a) => a.date.slice(0, 10) === selected.slice(0, 10))?.status;
  const answer = status ? ANSWER[status] : null;

  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => shift(from, i));
  const isToday = selected.slice(0, 10) === schoolToday();

  // 那一天到底發生了什麼，用一句話講完。沒有記錄時說清楚是「還沒填」還是「請假不會有」。
  const detail = (): string => {
    if (entry?.arrivalTime && (status === 'PRESENT' || status === 'LATE')) {
      return `早上 ${entry.arrivalTime} 進教室`;
    }
    if (status === 'LEAVE') return '這天沒有當日記錄';
    if (!hasContent(entry)) return '老師記錄後會出現在這裡';
    return isToday ? '老師還在記錄中，放學前會送出' : '';
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 日期橫條：近 7 天一點就到，再往前用左右鍵翻。每一格 44px 高，手指點得準。 */}
      <section className="flex items-center gap-1">
        <button
          type="button"
          aria-label="上一週"
          onClick={() => setSelected(shift(selected, -STRIP_DAYS))}
          className="tappable flex h-11 w-9 shrink-0 rotate-180 items-center justify-center text-ink-soft"
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
                aria-current={active ? 'date' : undefined}
                onClick={() => setSelected(iso)}
                className={`tappable flex min-h-touch flex-1 flex-col items-center justify-center rounded-md2 py-1.5 text-2xs transition ${
                  active ? 'bg-brand-primary font-bold text-brand-contrast' : 'text-ink-soft'
                }`}
              >
                <span>{['日', '一', '二', '三', '四', '五', '六'][new Date(iso).getUTCDay()]}</span>
                <span className="text-sm font-bold tabular-nums">{new Date(iso).getUTCDate()}</span>
                <span
                  aria-hidden
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    filled ? (active ? 'bg-brand-contrast' : 'bg-brand-primary') : 'bg-transparent'
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
          className="tappable flex h-11 w-9 shrink-0 items-center justify-center text-ink-soft disabled:opacity-30"
        >
          <Icon name="chev" className="h-4 w-4" />
        </button>
      </section>

      {isError && <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />}

      {/* 當日狀態：那一天的答案。 */}
      <StateCard
        eyebrow={dayLabel(selected)}
        headline={answer?.headline ?? '還沒點名'}
        detail={detail()}
        tone={answer?.tone ?? 'neutral'}
      >
        {isLoading && <SkeletonCards cards={1} />}
        {entry && hasContent(entry) && <BookEntryDetail entry={entry} />}
      </StateCard>

      {canEdit && <HealthEditor studentId={studentId} dateIso={selected} entry={entry} />}

      {/* 親師對話：連續、不依日期切割 */}
      <section>
        <SectionHead
          title="跟老師說話"
          description="這裡的對話不分日期，前後看得懂"
          weight="review"
        />
        <MessageThread studentId={studentId} />
      </section>
    </div>
  );
}

function BookEntryDetail({ entry }: { entry: BookEntryView }) {
  const rows: { label: string; value: string }[] = [];
  if (entry.lunch) rows.push({ label: '午餐', value: MEAL_LABEL[entry.lunch] });
  if (entry.snack) rows.push({ label: '點心', value: MEAL_LABEL[entry.snack] });
  if (entry.nap) rows.push({ label: '午睡', value: NAP_LABEL[entry.nap] });
  if (entry.toilet) rows.push({ label: '如廁', value: TOILET_LABEL[entry.toilet] });
  if (entry.mood) rows.push({ label: '心情', value: MOOD_LABEL[entry.mood] });
  if (entry.pickup) rows.push({ label: '接送', value: PICKUP_LABEL[entry.pickup] });

  return (
    <>
      {rows.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 border-t border-hairline pt-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline gap-2 py-1.5">
              <dt className="text-2xs opacity-70">{r.label}</dt>
              <dd className="text-sm font-bold">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <HealthSummary entry={entry} />

      {entry.teacherNote && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-2xs font-semibold opacity-70">老師今天寫的</p>
          <p className="mt-1.5 whitespace-pre-wrap text-base leading-relaxed">{entry.teacherNote}</p>
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
    <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
      <span className="text-2xs opacity-70">健康</span>
      {entry.temperature !== null && (
        <Badge tone="note">{entry.temperature.toFixed(1)}°C</Badge>
      )}
      {entry.symptoms.map((s) => (
        <Badge key={s} tone="note">
          {SYMPTOM_LABEL[s]}
        </Badge>
      ))}
    </div>
  );
}
