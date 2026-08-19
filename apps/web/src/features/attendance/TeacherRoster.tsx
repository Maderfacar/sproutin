'use client';

import { useState } from 'react';
import { useSelectedClass } from '../classes/hooks';
import { useMyStudents } from '../../lib/queries';
import { useBulkMarkAttendance, useClassAttendance, useMarkAttendance } from './hooks';
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_TONE } from './labels';
import { apiErrorMessage } from '../../lib/api';
import type { AttendanceStatus, AttendanceView } from '../../lib/types';
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
import { Icon } from '../../components/Icon';
import { schoolToday } from '../../lib/datetime';

// 老師點名。**打開就是今天這一班，一顆按鈕收掉九成工作。**
//
// 舊版的三個問題（Human Owner 2026-08-20）：
//   ① 要先選班級、再選日期，兩次之後才開始工作。
//   ② 每個孩子四顆一樣大的按鈕 —— 但實際上九成是「到校」，等於同一個決定做 25 次。
//   ③ 點下去只有 chip 變色，沒有「存好了」的訊號，老師不確定有沒有進去就再點一次。
//
// 改法：
//   · 班級與日期預設好（我的第一個班 · 今天），要換才動 —— 而且日期收進面板，
//     因為「改日期」是例外，不該每天佔一個欄位的位置。
//   · 進度條 + 已存檔一直在最上面。
//   · 一顆「剩下 N 人全部標到校」，之後只處理例外。
//   · 還沒點的排在上面且份量重，點完的收進下面可摺疊的一段 —— 這一頁的價值在於它會變短。

// 例外狀態。到校是主要按鈕，這三個是次要的。
const EXCEPTIONS: AttendanceStatus[] = ['LEAVE', 'ABSENT', 'LATE'];

function dateLabel(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 · 週${week}`;
}

export function TeacherRoster() {
  const { classes, classId, setClassId, isLoading: classesLoading } = useSelectedClass();
  const [date, setDate] = useState(schoolToday);
  const [dateSheet, setDateSheet] = useState(false);
  const [classSheet, setClassSheet] = useState(false);

  const dateIso = new Date(`${date}T00:00:00.000Z`).toISOString();
  const { data: students } = useMyStudents();
  const { data: existing, isLoading, isError, error, refetch } = useClassAttendance(classId, dateIso);
  const { mark, update } = useMarkAttendance(classId, dateIso);
  const bulk = useBulkMarkAttendance(classId, dateIso);

  const roster = (students ?? []).filter((s) => s.classId === classId);
  const byStudent = new Map<string, AttendanceView>();
  for (const row of existing ?? []) byStudent.set(row.studentId, row);

  const pending = roster.filter((s) => !byStudent.has(s.id));
  const done = roster.filter((s) => byStudent.has(s.id));
  const isToday = date === schoolToday();
  const saving = mark.isPending || update.isPending || bulk.isPending;

  function setStatus(studentId: string, status: AttendanceStatus): void {
    const row = byStudent.get(studentId);
    if (row) {
      update.mutate({ id: row.id, status });
    } else {
      mark.mutate({ studentId, date: dateIso, status });
    }
  }

  const currentClass = classes?.find((c) => c.id === classId);
  const bulkFailed = bulk.data?.failed.length ?? 0;

  if (classesLoading) {
    return <SkeletonRows rows={4} />;
  }
  if (classes && classes.length === 0) {
    return <EmptyState title="你目前沒有帶班級" hint="請園所指派班級後再回來點名" />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 班級與日期。預設就是對的，所以做小、放一起 —— 它們是「要換才動」不是「每次要填」。 */}
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

      {isError && <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />}
      {isLoading && <SkeletonRows rows={5} />}

      {!isLoading && roster.length === 0 && (
        <EmptyState title="這個班還沒有學生" hint="請先在學生管理裡把孩子加進班級" />
      )}

      {roster.length > 0 && (
        <>
          <Progress
            value={done.length}
            max={roster.length}
            unit="已點名"
            saved={!saving}
          />

          {bulkFailed > 0 && (
            <ErrorNotice
              message={`有 ${bulkFailed} 位沒有成功，請在下面單獨再點一次。`}
            />
          )}

          {/* 這一頁唯一的主要按鈕。九成的工作在這一下就結束。 */}
          {pending.length > 0 && (
            <Button
              variant="primary"
              disabled={saving}
              onClick={() =>
                bulk.mutate({ studentIds: pending.map((s) => s.id), status: 'PRESENT' })
              }
            >
              <Icon name="check" className="h-5 w-5" />
              {bulk.isPending
                ? '標記中…'
                : `剩下 ${pending.length} 人全部標「到校」`}
            </Button>
          )}

          {pending.length === 0 && (
            <div className="rounded-tile border border-good-edge bg-good-wash p-5 text-good-text">
              <p className="font-serif text-2xl font-bold">今天點完了</p>
              <p className="mt-1 text-sm opacity-90">有人臨時到校的話，在下面改掉就好。</p>
            </div>
          )}

          {pending.length > 0 && (
            <section className="flex flex-col gap-2">
              <p className="text-2xs font-semibold text-ink-mute">
                還沒點名（{pending.length}）
              </p>
              {pending.map((s) => (
                <div
                  key={s.id}
                  className="rounded-card border border-line-strong bg-surface p-3.5"
                >
                  <p className="mb-2.5 text-lg font-bold text-ink">{s.name}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setStatus(s.id, 'PRESENT')}
                      className="tappable min-h-touch flex-1 rounded-md2 bg-good-wash font-bold text-good-text ring-1 ring-inset ring-good-edge disabled:opacity-50"
                    >
                      到校
                    </button>
                    {EXCEPTIONS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={saving}
                        onClick={() => setStatus(s.id, st)}
                        className="tappable min-h-touch rounded-md2 border border-line px-3 text-2xs font-semibold text-ink-soft disabled:opacity-50"
                      >
                        {ATTENDANCE_STATUS_LABEL[st].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 點完的收起來 —— 這一頁的價值在於它會變短。要改的時候才展開。 */}
          {done.length > 0 && (
            <details className="rounded-card border border-line bg-surface">
              <summary className="tappable flex min-h-touch cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-ink-soft">
                已完成（{done.length}）
                <Icon name="chev" className="ml-auto h-4 w-4 rotate-90" />
              </summary>
              <ul className="px-4 pb-2">
                {done.map((s) => {
                  const current = byStudent.get(s.id)?.status;
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-2 border-t border-line py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{s.name}</span>
                      {current && (
                        <Badge tone={ATTENDANCE_STATUS_TONE[current]}>
                          {ATTENDANCE_STATUS_LABEL[current].label}
                        </Badge>
                      )}
                      <div className="flex w-full gap-1.5">
                        {(['PRESENT', ...EXCEPTIONS] as AttendanceStatus[])
                          .filter((st) => st !== current)
                          .map((st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={saving}
                              onClick={() => setStatus(s.id, st)}
                              className="tappable min-h-touch flex-1 rounded-md2 border border-line text-2xs font-semibold text-ink-soft disabled:opacity-50"
                            >
                              改成{ATTENDANCE_STATUS_LABEL[st].label}
                            </button>
                          ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </>
      )}

      {(mark.isError || update.isError) && (
        <ErrorNotice message={apiErrorMessage(mark.error ?? update.error)} />
      )}

      {/* 換日期是例外動作，收進面板 —— 不該每天佔一個欄位的位置。 */}
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

      {/* 班級超過三個就攤不開了，改用面板選 —— 硬擠成一排比下拉更糟。 */}
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
