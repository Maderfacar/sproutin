'use client';

import { useLeaves, useCancelLeave, isOptimisticLeave } from './hooks';
import { CANCELLABLE_STATUSES, LEAVE_STATUS_LABEL, leaveErrorMessage } from './labels';
import type { LeaveView } from '../../lib/types';
import { SkeletonRows } from '../../components/Skeleton';

function formatRange(leave: LeaveView): string {
  const from = leave.dateFrom.slice(0, 10);
  const to = leave.dateTo.slice(0, 10);
  return from === to ? from : `${from} ～ ${to}`;
}

export function LeaveList({ studentId }: { studentId: string }) {
  const { data: leaves, isLoading, isError, error } = useLeaves(studentId);
  const cancelLeave = useCancelLeave();

  if (isLoading) {
    return <SkeletonRows rows={4} />;
  }
  if (isError) {
    return <p className="text-sm text-stop-text">{leaveErrorMessage(error)}</p>;
  }
  if (!leaves || leaves.length === 0) {
    return <p className="text-sm text-ink-soft">目前沒有請假紀錄。</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {leaves.map((leave) => {
        // 剛按下送出、伺服器還沒回來的那一列：不宣稱狀態（我們還不知道），也不能取消。
        const sending = isOptimisticLeave(leave);
        const status = LEAVE_STATUS_LABEL[leave.status];
        const canCancel = !sending && CANCELLABLE_STATUSES.includes(leave.status);
        return (
          <li key={leave.id} className={`card p-4 ${sending ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-semibold text-ink tabular-nums">
                {formatRange(leave)}
              </span>
              {sending ? (
                <span className="chip bg-black/5 text-ink-soft">送出中…</span>
              ) : (
                <span className={`chip ${status.className}`}>{status.label}</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-soft">{leave.reason}</p>
            {leave.reviewNote && (
              <p className="mt-1 text-sm text-ink-soft">審核備註：{leave.reviewNote}</p>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => cancelLeave.mutate(leave.id)}
                disabled={cancelLeave.isPending}
                className="btn-secondary mt-3 text-sm"
              >
                取消請假
              </button>
            )}
          </li>
        );
      })}
      {cancelLeave.isError && (
        <li className="text-sm text-stop-text">{leaveErrorMessage(cancelLeave.error)}</li>
      )}
    </ul>
  );
}
