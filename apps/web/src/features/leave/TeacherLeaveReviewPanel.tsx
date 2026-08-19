'use client';

import { ClassSelect } from '../../components/ClassSelect';
import { useSelectedClass } from '../classes/hooks';
import { useMyStudents } from '../../lib/queries';
import { useClassPendingLeaves, useSetLeaveStatus } from './hooks';
import { leaveErrorMessage } from './labels';
import type { LeaveView } from '../../lib/types';
import { SkeletonLines } from '../../components/Skeleton';

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
    <section className="card flex flex-col gap-3 p-5">
      {classesLoading && <SkeletonLines lines={1} />}
      {classes && classes.length === 0 && <p className="text-sm text-ink-soft">你目前沒有任教班級。</p>}

      <ClassSelect classes={classes} value={classId} onChange={setClassId} />

      {classId && isLoading && <p className="text-sm text-ink-soft">載入待審請假中…</p>}
      {classId && isError && <p className="text-sm text-stop-text">{leaveErrorMessage(error)}</p>}
      {classId && pending && pending.length === 0 && (
        <p className="text-sm text-ink-soft">目前沒有待審核的請假。</p>
      )}

      {pending && pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map((leave) => (
            <li key={leave.id} className="rounded-md2 border border-line p-3">
              <p className="font-bold text-ink">{nameOf(leave.studentId)}</p>
              <p className="text-sm text-ink-soft">
                {range(leave)}｜{leave.reason}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ leaveId: leave.id, body: { status: 'APPROVED' } })}
                  disabled={setStatus.isPending}
                  className="btn-primary px-4 py-1.5 text-sm"
                >
                  核准
                </button>
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ leaveId: leave.id, body: { status: 'REJECTED' } })}
                  disabled={setStatus.isPending}
                  className="btn-secondary text-sm"
                >
                  駁回
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {setStatus.isError && <p className="text-sm text-stop-text">{leaveErrorMessage(setStatus.error)}</p>}
    </section>
  );
}
