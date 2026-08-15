'use client';

import { useLeaves, useCancelLeave } from './hooks';
import { CANCELLABLE_STATUSES, LEAVE_STATUS_LABEL, leaveErrorMessage } from './labels';
import type { LeaveView } from '../../lib/types';

function formatRange(leave: LeaveView): string {
  const from = leave.dateFrom.slice(0, 10);
  const to = leave.dateTo.slice(0, 10);
  return from === to ? from : `${from} ～ ${to}`;
}

export function LeaveList({ studentId }: { studentId: string }) {
  const { data: leaves, isLoading, isError, error } = useLeaves(studentId);
  const cancelLeave = useCancelLeave();

  if (isLoading) {
    return <p className="text-sm text-gray-500">載入請假紀錄中…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{leaveErrorMessage(error)}</p>;
  }
  if (!leaves || leaves.length === 0) {
    return <p className="text-sm text-gray-500">目前沒有請假紀錄。</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {leaves.map((leave) => {
        const status = LEAVE_STATUS_LABEL[leave.status];
        const canCancel = CANCELLABLE_STATUSES.includes(leave.status);
        return (
          <li key={leave.id} className="rounded-card border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{formatRange(leave)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{leave.reason}</p>
            {leave.reviewNote && (
              <p className="mt-1 text-sm text-gray-500">審核備註：{leave.reviewNote}</p>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => cancelLeave.mutate(leave.id)}
                disabled={cancelLeave.isPending}
                className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                取消請假
              </button>
            )}
          </li>
        );
      })}
      {cancelLeave.isError && (
        <li className="text-sm text-red-600">{leaveErrorMessage(cancelLeave.error)}</li>
      )}
    </ul>
  );
}
