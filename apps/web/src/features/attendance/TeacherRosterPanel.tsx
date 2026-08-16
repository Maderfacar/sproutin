'use client';

import { useState } from 'react';
import { ClassSelect } from '../../components/ClassSelect';
import { useSelectedClass } from '../classes/hooks';
import { useMyStudents } from '../../lib/queries';
import { useClassAttendance, useMarkAttendance } from './hooks';
import { ATTENDANCE_STATUS_LABEL } from './labels';
import { apiErrorMessage } from '../../lib/api';
import type { AttendanceStatus, AttendanceView } from '../../lib/types';

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
    <section className="flex flex-col gap-3 rounded-card border border-gray-200 bg-white p-4">
      <h2 className="font-semibold text-gray-900">點名（老師）</h2>

      {classesLoading && <p className="text-sm text-gray-500">載入班級中…</p>}
      {classes && classes.length === 0 && (
        <p className="text-sm text-gray-500">你目前沒有任教班級。</p>
      )}

      <ClassSelect classes={classes} value={classId} onChange={setClassId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-600">日期</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2"
        />
      </label>

      {classId && isLoading && <p className="text-sm text-gray-500">載入點名資料中…</p>}
      {classId && isError && <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>}
      {classId && roster.length === 0 && <p className="text-sm text-gray-500">此班沒有學生。</p>}

      {roster.length > 0 && (
        <ul className="flex flex-col gap-2">
          {roster.map((s) => {
            const current = byStudent.get(s.id)?.status;
            return (
              <li key={s.id} className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 font-medium text-gray-900">{s.name}</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((st) => {
                    const active = current === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(s.id, st)}
                        disabled={pending}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                          active
                            ? ATTENDANCE_STATUS_LABEL[st].className
                            : 'border border-gray-300 text-gray-600'
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
