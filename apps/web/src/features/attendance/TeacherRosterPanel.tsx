'use client';

import { useState } from 'react';
import { ClassSelect } from '../../components/ClassSelect';
import { useSelectedClass } from '../classes/hooks';
import { useMyStudents } from '../../lib/queries';
import { useClassAttendance, useMarkAttendance } from './hooks';
import { ATTENDANCE_STATUS_LABEL } from './labels';
import { apiErrorMessage } from '../../lib/api';
import type { AttendanceStatus, AttendanceView } from '../../lib/types';
import { SkeletonLines } from '../../components/Skeleton';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LEAVE', 'LATE'];

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

// 老師端:一天一班點名。列出班級學生 → 每人選狀態（新標記或改狀態）。
export function TeacherRosterPanel() {
  const { classes, classId, setClassId, isLoading: classesLoading } = useSelectedClass();
  const [date, setDate] = useState(todayInput);
  const dateIso = new Date(`${date}T00:00:00.000Z`).toISOString();

  const { data: students } = useMyStudents();
  const { data: existing, isLoading, isError, error } = useClassAttendance(classId, dateIso);
  const { mark, update } = useMarkAttendance(classId, dateIso);

  const roster = (students ?? []).filter((s) => s.classId === classId);
  const byStudent = new Map<string, AttendanceView>();
  for (const row of existing ?? []) byStudent.set(row.studentId, row);

  function setStatus(studentId: string, status: AttendanceStatus): void {
    const row = byStudent.get(studentId);
    if (row) {
      update.mutate({ id: row.id, status });
    } else {
      mark.mutate({ studentId, date: dateIso, status });
    }
  }

  const pending = mark.isPending || update.isPending;

  return (
    <section className="card flex flex-col gap-3 p-5">
      {classesLoading && <SkeletonLines lines={1} />}
      {classes && classes.length === 0 && <p className="text-sm text-ink-soft">你目前沒有任教班級。</p>}

      <ClassSelect classes={classes} value={classId} onChange={setClassId} />
      <label className="field-label">
        <span>日期</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
      </label>

      {classId && isLoading && <p className="text-sm text-ink-soft">載入點名資料中…</p>}
      {classId && isError && <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>}
      {classId && roster.length === 0 && <p className="text-sm text-ink-soft">此班沒有學生。</p>}

      {roster.length > 0 && (
        <ul className="flex flex-col gap-2">
          {roster.map((s) => {
            const current = byStudent.get(s.id)?.status;
            return (
              <li key={s.id} className="rounded-md2 border border-line p-3">
                <p className="mb-2 font-bold text-ink">{s.name}</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((st) => {
                    const active = current === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(s.id, st)}
                        disabled={pending}
                        className={`chip transition disabled:opacity-50 ${
                          active
                            ? ATTENDANCE_STATUS_LABEL[st].className
                            : 'border border-line text-ink-soft'
                        }`}
                      >
                        {ATTENDANCE_STATUS_LABEL[st].label}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(mark.isError || update.isError) && (
        <p className="text-sm text-red-600">{apiErrorMessage(mark.error ?? update.error)}</p>
      )}
    </section>
  );
}
