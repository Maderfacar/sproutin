'use client';

import { useMyStudents } from '../../lib/queries';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { useSchoolPendingLeaves, useSetLeaveStatus } from './hooks';
import { leaveErrorMessage } from './labels';
import type { LeaveView } from '../../lib/types';
import { SkeletonRows } from '../../components/Skeleton';

function range(leave: LeaveView): string {
  const from = leave.dateFrom.slice(0, 10);
  const to = leave.dateTo.slice(0, 10);
  return from === to ? from : `${from} ～ ${to}`;
}

// 園長/行政:全校待審請假總覽（跨班一次看,Step 7d）。行政可核准/駁回;園長唯讀。
export function SchoolLeaveOverviewPanel() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: pending, isLoading, isError, error } = useSchoolPendingLeaves(true);
  const { data: students } = useMyStudents();
  const setStatus = useSetLeaveStatus();

  const nameOf = (studentId: string): string =>
    students?.find((s) => s.id === studentId)?.name ?? studentId;

  return (
    <section className="card flex flex-col gap-3 p-5">
      {isLoading && <SkeletonRows rows={4} />}
      {isError && <p className="text-sm text-stop-text">{leaveErrorMessage(error)}</p>}
      {pending && pending.length === 0 && (
        <p className="text-sm text-ink-soft">目前全校沒有待審核的請假。</p>
      )}

      {pending && pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map((leave) => (
            <li key={leave.id} className="rounded-md2 border border-line p-3">
              <p className="font-bold text-ink">{nameOf(leave.studentId)}</p>
              <p className="text-sm text-ink-soft">
                {range(leave)}｜{leave.reason}
              </p>
              {flags.canReviewLeave && (
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
              )}
            </li>
          ))}
        </ul>
      )}

      {setStatus.isError && <p className="text-sm text-stop-text">{leaveErrorMessage(setStatus.error)}</p>}
    </section>
  );
}
