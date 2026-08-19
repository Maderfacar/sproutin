'use client';

import { useState } from 'react';
import { SurfaceLink } from '../../components/SurfaceLink';
import { Icon } from '../../components/Icon';
import { useSelectedClass } from '../classes/hooks';
import { useVisibleStudents } from '../students/useSelectedStudent';
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
import {
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  Progress,
  Segmented,
  Sheet,
  SkeletonRows,
} from '../../components/ui';
import { formatTime, schoolToday } from '../../lib/datetime';

// 老師端「直欄模式」：一次只處理一件事、全班一起，且**預設全班正常、只點例外**。
// 這是把導師負擔壓下來的關鍵（逐生逐欄約需 175 次點擊，此設計約 25 次，Human Owner 2026-08-17 驗收）。
// 健康與留言不在直欄模式內 —— 那是例外情形，進單一學生頁處理（兩種模式並存）。
//
// 清葉加厚（2026-08-20）**只改視覺與回饋，流程一步都沒動**：
//   · 班級改攤開的分段選擇器、日期收進面板（預設就是今天這一班，要換才動）
//   · 最上面固定一條進度 + 已存檔 —— 老師原本點下去沒有任何「存好了」的訊號
//   · 「全班預設」升格為這一頁唯一的主要按鈕（九成的工作在這一下）

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

function nowHhMm(): string {
  return formatTime(new Date());
}

function dateLabel(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 · 週${week}`;
}

export function TeacherBookPanel() {
  const { classes, classId, setClassId, isLoading: classesLoading } = useSelectedClass();
  const [date, setDate] = useState(schoolToday);
  const [column, setColumn] = useState<ColumnId>('lunch');
  const [dateSheet, setDateSheet] = useState(false);
  const [classSheet, setClassSheet] = useState(false);
  const dateIso = new Date(`${date}T00:00:00.000Z`).toISOString();

  const { data: students } = useVisibleStudents();
  const { data: entries, isLoading, isError, error, refetch } = useClassBook(classId, dateIso);
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
  const columnDone = active.filter((s) => byStudent.get(s.id)?.[activeColumn.id] != null).length;
  const isToday = date === schoolToday();
  const currentClass = classes?.find((c) => c.id === classId);

  if (classesLoading) {
    return <SkeletonRows rows={4} />;
  }
  if (classes && classes.length === 0) {
    return <EmptyState title="你目前沒有帶班級" hint="請園所指派班級後再回來" />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 班級與日期。預設就是對的，所以做小、放一起。 */}
      <div className="flex flex-wrap items-center gap-2">
        {classes && classes.length > 1 && classes.length <= 3 && (
          <Segmented
            label="選擇班級"
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            value={classId}
            onChange={setClassId}
          />
        )}
        {classes && classes.length > 3 && (
          <Button variant="secondary" onClick={() => setClassSheet(true)}>
            {currentClass?.name ?? '選擇班級'}
            <Icon name="chev" className="h-4 w-4 rotate-90" />
          </Button>
        )}
        <Button variant={isToday ? 'text' : 'secondary'} onClick={() => setDateSheet(true)}>
          {isToday ? '今天' : dateLabel(date)}
          <Icon name="cal" className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && <SkeletonRows rows={5} />}
      {isError && <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />}
      {classId && roster.length === 0 && !isLoading && (
        <EmptyState title="這個班還沒有學生" hint="請先在學生管理裡把孩子加進班級" />
      )}

      {active.length > 0 && (
        <>
          {/* 老師原本點下去只有顏色變，不知道有沒有存進去 —— 這一條就是為了那件事。 */}
          <Progress
            value={active.length - unfilled.length}
            max={active.length}
            unit="已記錄"
            saved={!pending}
          />

          {roster.length > active.length && (
            <p className="-mt-2 text-2xs text-ink-mute">
              今天有 {roster.length - active.length} 位請假或未到校，不需要記錄
            </p>
          )}

          {needAttention.length > 0 && (
            <div className="rounded-md2 border border-note-edge bg-note-wash px-4 py-3 text-sm font-bold text-note-text">
              今天有 {needAttention.length} 位健康需要注意，記得進去看一下
            </div>
          )}

          {/* 到校：一個動作同時完成點名與記錄到校時間 */}
          <section className="rounded-tile border border-line-strong bg-surface p-4">
            <div className="mb-2 flex items-baseline gap-2">
              <h3 className="font-serif text-lg font-bold text-ink">到校</h3>
              <span className="text-2xs text-ink-soft">點一下＝同時完成點名</span>
            </div>
            <ul>
              {active.map((s) => {
                const arrival = byStudent.get(s.id)?.arrivalTime;
                return (
                  <li
                    key={s.id}
                    className="flex min-h-touch items-center gap-2 border-t border-line py-2"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{s.name}</span>
                    {arrival ? (
                      <Badge tone="good">{arrival}</Badge>
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
                          className="tappable min-h-touch rounded-md2 bg-good-wash px-4 text-sm font-bold text-good-text ring-1 ring-inset ring-good-edge disabled:opacity-50"
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
                          className="tappable min-h-touch rounded-md2 border border-line px-3 text-2xs font-semibold text-ink-soft disabled:opacity-50"
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

          {/* 直欄模式：一次一件事，全班一起 */}
          <section className="rounded-tile border border-line-strong bg-surface p-4">
            <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {COLUMNS.map((c) => {
                const on = c.id === column;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setColumn(c.id)}
                    className={`tappable min-h-touch shrink-0 rounded-md2 px-4 text-sm transition ${
                      on
                        ? 'bg-brand-primary font-bold text-brand-contrast'
                        : 'border border-line font-semibold text-ink-soft'
                    }`}
                  >
                    {c.title}
                  </button>
                );
              })}
            </div>

            <p className="mb-2 text-2xs text-ink-soft">
              {activeColumn.title}：{columnDone} / {active.length} 位已填
            </p>

            {/* 這一頁的主要按鈕。九成的工作在這一下就結束，往下只點不一樣的孩子。 */}
            <Button variant="primary" onClick={applyDefaultToAll} disabled={pending}>
              <Icon name="check" className="h-5 w-5" />
              全班先填「{activeColumn.label[defaultValue]}」
            </Button>
            <p className="mt-2 text-2xs text-ink-mute">已經點過的不會被蓋掉。</p>

            <ul className="mt-3">
              {active.map((s) => {
                const current = byStudent.get(s.id)?.[activeColumn.id] ?? null;
                return (
                  <li key={s.id} className="border-t border-line py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{s.name}</span>
                      <SurfaceLink
                        href={`/liff/communication-book/${s.id}`}
                        aria-label={`開啟 ${s.name} 的聯絡簿`}
                        className="tappable flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft"
                      >
                        <Icon name="chev" className="h-4 w-4" />
                      </SurfaceLink>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activeColumn.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            setField(s.id, { [activeColumn.id]: opt } as Partial<SaveBookEntryBody>)
                          }
                          className={`tappable min-h-touch rounded-md2 px-3 text-sm transition disabled:opacity-50 ${
                            current === opt
                              ? 'bg-good-wash font-bold text-good-text ring-1 ring-inset ring-good-edge'
                              : 'border border-line font-semibold text-ink-soft'
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
        </>
      )}

      {/* 今日不需記錄（請假/缺席）—— 收起來，因為老師不必為他們花時間。 */}
      {roster.length > active.length && (
        <details className="rounded-card border border-line bg-surface">
          <summary className="tappable flex min-h-touch cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-ink-soft">
            今天不需記錄（{roster.length - active.length}）
            <Icon name="chev" className="ml-auto h-4 w-4 rotate-90" />
          </summary>
          <ul className="px-4 pb-2">
            {roster
              .filter((s) => isAway(s.id))
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 border-t border-line py-2.5 text-sm text-ink-soft"
                >
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <Badge tone={attendanceByStudent.get(s.id) === 'LEAVE' ? 'wait' : 'stop'}>
                    {attendanceByStudent.get(s.id) === 'LEAVE' ? '今天請假' : '今天沒到校'}
                  </Badge>
                </li>
              ))}
          </ul>
        </details>
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
        <ErrorNotice
          message={bookErrorMessage(
            save.error ?? checkIn.error,
            apiErrorMessage(save.error ?? checkIn.error),
          )}
        />
      )}

      {/* 換日期是例外動作，收進面板。 */}
      <Sheet open={dateSheet} title="看哪一天" onClose={() => setDateSheet(false)}>
        <div className="flex flex-col gap-4">
          <Field label="日期">
            <input
              type="date"
              value={date}
              max={schoolToday()}
              onChange={(e) => setDate(e.target.value)}
              className="field tabular-nums"
            />
          </Field>
          <Button
            variant="secondary"
            onClick={() => {
              setDate(schoolToday());
              setDateSheet(false);
            }}
          >
            回到今天
          </Button>
        </div>
      </Sheet>

      {/* 班級超過三個就攤不開了，改用面板選。 */}
      <Sheet open={classSheet} title="選擇班級" onClose={() => setClassSheet(false)}>
        <ul className="flex flex-col gap-2">
          {(classes ?? []).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setClassId(c.id);
                  setClassSheet(false);
                }}
                aria-current={c.id === classId ? 'true' : undefined}
                className={`tappable flex min-h-touch w-full items-center rounded-md2 border px-4 py-3 text-left text-base font-bold ${
                  c.id === classId
                    ? 'border-brand-primary bg-brand-wash text-brand-primary'
                    : 'border-line-strong bg-surface text-ink'
                }`}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
