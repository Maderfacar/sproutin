'use client';

import { useState } from 'react';
import { SurfaceLink } from '../../components/SurfaceLink';
import { ClassSelect } from '../../components/ClassSelect';
import { Icon } from '../../components/Icon';
import { useSelectedClass } from '../classes/hooks';
import { useMyStudents } from '../../lib/queries';
import { useClassAttendance } from '../attendance/hooks';
import { apiErrorMessage } from '../../lib/api';
import type { BookEntryView, SaveBookEntryBody } from '../../lib/types';
import {
  MEAL_LABEL,
  MEAL_OPTIONS,
  MOOD_LABEL,
  MOOD_OPTIONS,
  NAP_LABEL,
  NAP_OPTIONS,
  PICKUP_LABEL,
  PICKUP_OPTIONS,
  TOILET_LABEL,
  TOILET_OPTIONS,
} from './labels';
import { bookErrorMessage, hasContent, needsHealthAttention, useBookMutations, useClassBook } from './hooks';
import { PublishPanel } from './PublishPanel';
import { SkeletonLines } from '../../components/Skeleton';

// 老師端「直欄模式」：一次只處理一件事、全班一起，且**預設全班正常、只點例外**。
// 這是把導師負擔壓下來的關鍵（逐生逐欄約需 175 次點擊，此設計約 25 次）。
// 健康與留言不在直欄模式內 —— 那是例外情形，進單一學生頁處理（兩種模式並存）。

type ColumnId = 'lunch' | 'snack' | 'nap' | 'toilet' | 'mood' | 'pickup';

interface ColumnDef {
  id: ColumnId;
  title: string;
  options: readonly string[];
  label: Record<string, string>;
}

const COLUMNS: readonly ColumnDef[] = [
  { id: 'lunch', title: '午餐', options: MEAL_OPTIONS, label: MEAL_LABEL },
  { id: 'snack', title: '點心', options: MEAL_OPTIONS, label: MEAL_LABEL },
  { id: 'nap', title: '午睡', options: NAP_OPTIONS, label: NAP_LABEL },
  { id: 'toilet', title: '如廁', options: TOILET_OPTIONS, label: TOILET_LABEL },
  { id: 'mood', title: '心情', options: MOOD_OPTIONS, label: MOOD_LABEL },
  { id: 'pickup', title: '接送', options: PICKUP_OPTIONS, label: PICKUP_LABEL },
];

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowHhMm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TeacherBookPanel() {
  const { classes, classId, setClassId, isLoading: classesLoading } = useSelectedClass();
  const [date, setDate] = useState(todayInput);
  const [column, setColumn] = useState<ColumnId>('lunch');
  const dateIso = new Date(`${date}T00:00:00.000Z`).toISOString();

  const { data: students } = useMyStudents();
  const { data: entries, isLoading, isError, error } = useClassBook(classId, dateIso);
  const { data: attendance } = useClassAttendance(classId, dateIso);
  const { save, checkIn, publish } = useBookMutations();

  const roster = (students ?? []).filter((s) => s.classId === classId);
  const byStudent = new Map<string, BookEntryView>();
  for (const row of entries ?? []) byStudent.set(row.studentId, row);
  const attendanceByStudent = new Map((attendance ?? []).map((a) => [a.studentId, a.status]));

  // 請假 / 缺席的孩子不需要填寫，直接排除在待辦之外（老師不必為他們花任何時間）。
  const isAway = (studentId: string): boolean => {
    const status = attendanceByStudent.get(studentId);
    return status === 'LEAVE' || status === 'ABSENT';
  };
  const active = roster.filter((s) => !isAway(s.id));

  const activeColumn = COLUMNS.find((c) => c.id === column)!;
  const defaultValue = activeColumn.options[0]!;
  const pending = save.isPending || checkIn.isPending;

  function setField(studentId: string, patch: Partial<SaveBookEntryBody>): void {
    save.mutate({ studentId, date: dateIso, ...patch });
  }

  // 一鍵套用：只填「還沒有值」的學生，已經點過的不會被蓋掉。
  function applyDefaultToAll(): void {
    for (const student of active) {
      const entry = byStudent.get(student.id);
      if (entry && entry[activeColumn.id] !== null) continue;
      setField(student.id, { [activeColumn.id]: defaultValue } as Partial<SaveBookEntryBody>);
    }
  }

  const needAttention = active.filter((s) => {
    const entry = byStudent.get(s.id);
    return entry ? needsHealthAttention(entry) : false;
  });
  const unfilled = active.filter((s) => !hasContent(byStudent.get(s.id)));

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-5">
        <ClassSelect classes={classes} value={classId} onChange={setClassId} />
        <label className="field-label">
          <span>日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
        </label>

        {classesLoading && <SkeletonLines lines={1} />}
        {classes && classes.length === 0 && <p className="text-sm text-ink-soft">你目前沒有任教班級。</p>}
        {classId && isLoading && <p className="text-sm text-ink-soft">載入聯絡簿中…</p>}
        {classId && isError && <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>}

        {active.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-line pt-3 text-xs text-ink-soft">
            <p>
              待記錄 {unfilled.length} 位 · 今日不需記錄 {roster.length - active.length} 位
            </p>
            {needAttention.length > 0 && (
              <p className="font-semibold text-amber-700">
                本班今日 {needAttention.length} 位健康需注意
              </p>
            )}
          </div>
        )}
      </section>

      {classId && roster.length === 0 && <p className="text-sm text-ink-soft">此班沒有學生。</p>}

      {/* 到校：一個動作同時完成點名與記錄到校時間 */}
      {active.length > 0 && (
        <section className="card flex flex-col gap-3 p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-base font-semibold text-ink">到校</h3>
            <span className="text-xs text-ink-soft">點一下＝同時完成點名</span>
          </div>
          <ul className="border-t border-line">
            {active.map((s) => {
              const arrival = byStudent.get(s.id)?.arrivalTime;
              return (
                <li key={s.id} className="flex items-center gap-3 border-b border-line py-2.5">
                  <span className="flex-1 text-sm text-ink">{s.name}</span>
                  {arrival ? (
                    <span className="text-sm font-semibold tabular-nums text-brand-primary">{arrival}</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          checkIn.mutate({
                            studentId: s.id,
                            date: dateIso,
                            arrivalTime: nowHhMm(),
                            status: 'PRESENT',
                          })
                        }
                        className="chip border border-line text-ink-soft transition disabled:opacity-50"
                      >
                        到校
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          checkIn.mutate({
                            studentId: s.id,
                            date: dateIso,
                            arrivalTime: nowHhMm(),
                            status: 'LATE',
                          })
                        }
                        className="chip border border-line text-ink-soft transition disabled:opacity-50"
                      >
                        遲到
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 直欄模式：一次一件事，全班一起 */}
      {active.length > 0 && (
        <section className="card flex flex-col gap-3 p-5">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1">
            {COLUMNS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColumn(c.id)}
                className={`chip shrink-0 transition ${
                  c.id === column ? 'bg-brand-primary text-white' : 'border border-line text-ink-soft'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={applyDefaultToAll}
            disabled={pending}
            className="rounded-md2 border border-line py-2.5 text-sm font-semibold text-brand-primary transition disabled:opacity-50"
          >
            全班預設「{activeColumn.label[defaultValue]}」
          </button>
          <p className="-mt-1 text-xs text-ink-soft">往下只點不一樣的孩子；已經點過的不會被蓋掉。</p>

          <ul className="border-t border-line">
            {active.map((s) => {
              const current = byStudent.get(s.id)?.[activeColumn.id] ?? null;
              return (
                <li key={s.id} className="border-b border-line py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm text-ink">{s.name}</span>
                    <SurfaceLink
                      href={`/liff/communication-book/${s.id}`}
                      aria-label={`開啟 ${s.name} 的聯絡簿`}
                      className="text-ink-soft"
                    >
                      <Icon name="chev" className="h-4 w-4" />
                    </SurfaceLink>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {activeColumn.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setField(s.id, { [activeColumn.id]: opt } as Partial<SaveBookEntryBody>)
                        }
                        className={`chip transition disabled:opacity-50 ${
                          current === opt
                            ? 'bg-brand-primary text-white'
                            : 'border border-line text-ink-soft'
                        }`}
                      >
                        {activeColumn.label[opt]}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 今日不需記錄（請假/缺席） */}
      {roster.length > active.length && (
        <section className="card p-5">
          <h3 className="font-serif text-base font-semibold text-ink">今日不需記錄</h3>
          <ul className="mt-2 border-t border-line">
            {roster
              .filter((s) => isAway(s.id))
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between border-b border-line py-2.5 text-sm text-ink-soft"
                >
                  <span>{s.name}</span>
                  <span>{attendanceByStudent.get(s.id) === 'LEAVE' ? '今日請假' : '今日未到校'}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {classId && active.length > 0 && (
        <PublishPanel
          classId={classId}
          dateIso={dateIso}
          students={active}
          entries={byStudent}
          publish={publish}
        />
      )}

      {(save.isError || checkIn.isError) && (
        <p className="text-sm text-red-600">
          {bookErrorMessage(save.error ?? checkIn.error, apiErrorMessage(save.error ?? checkIn.error))}
        </p>
      )}
    </div>
  );
}
