'use client';

import { ClassSelect } from '../../components/ClassSelect';
import { useSelectedClass } from '../classes/hooks';
import { useMyStudents } from '../../lib/queries';
import { useClassPendingLeaves, useSetLeaveStatus } from './hooks';
import { leaveErrorMessage } from './labels';
import type { LeaveView } from '../../lib/types';

function range(leave: LeaveView): string {
  const from = leave.dateFrom.slice(0, 10);
  const to = leave.dateTo.slice(0, 10);
  return from === to ? from : `${from} ～ ${to}`;
}

// 老師端:審核整班待審請假（core:approve/reject）。
export function TeacherLeaveReviewPanel() {
  const { classes, classId, setClassId, isLoading: classesLoading } = useSelectedClass();
  const { data: students } = useMyStudents();
  const { data: pending, isLoading, isError, error } = useClassPendingLeaves(classId);
  const setStatus = useSetLeaveStatus();

  const nameOf = (studentId: string): string =>
    students?.find((s) => s.id === studentId)?.name ?? studentId;

  return (
    <section className="flex flex-col gap-3 rounded-card border border-gray-200 bg-white p-4">
      <h2 className="font-semibold text-gray-900">待審核請假（老師）</h2>

      {classesLoading && <p className="text-sm text-gray-500">載入班級中…</p>}
      {classes && classes.length === 0 && (
        <p className="text-sm text-gray-500">你目前沒有任教班級。</p>
      )}

      <ClassSelect classes={classes} value={classId} onChange={setClassId} />

      {classId && isLoading && <p className="text-sm text-gray-500">載入待審請假中…</p>}
      {classId && isError && <p className="text-sm text-red-600">{leaveErrorMessage(error)}</p>}
      {classId && pending && pending.length === 0 && (
        <p className="text-sm text-gray-500">目前沒有待審核的請假。</p>
      )}

      {pending && pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map((leave) => (
            <li key={leave.id} className="rounded-lg border border-gray-200 p-3">
              <p className="font-medium text-gray-900">{nameOf(leave.studentId)}</p>
              <p className="text-sm text-gray-600">
                {range(leave)}｜{leave.reason}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ leaveId: leave.id, body: { status: 'APPROVED' } })}
                  disabled={setStatus.isPending}
                  className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  核准
                </button>
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ leaveId: leave.id, body: { status: 'REJECTED' } })}
                  disabled={setStatus.isPending}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
                >
                  駁回
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {setStatus.isError && <p className="text-sm text-red-600">{leaveErrorMessage(setStatus.error)}</p>}
    </section>
  );
}
