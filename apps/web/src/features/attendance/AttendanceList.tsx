'use client';

import { useAttendance } from './hooks';
import { ATTENDANCE_STATUS_LABEL } from './labels';
import { apiErrorMessage } from '../../lib/api';
import type { AttendanceView } from '../../lib/types';
import { SkeletonRows } from '../../components/Skeleton';

function byDateDesc(a: AttendanceView, b: AttendanceView): number {
  return b.date.localeCompare(a.date);
}

// 家長出缺勤:依日期清單（Human Owner 決策）。唯讀。
export function AttendanceList({ studentId }: { studentId: string }) {
  const { data, isLoading, isError, error } = useAttendance(studentId);

  if (isLoading) {
    return <SkeletonRows rows={5} />;
  }
  if (isError) {
    return <p className="text-sm text-stop-text">{apiErrorMessage(error)}</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-ink-soft">目前沒有出缺勤紀錄。</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {[...data].sort(byDateDesc).map((row) => {
        const status = ATTENDANCE_STATUS_LABEL[row.status];
        return (
          <li key={row.id} className="card flex items-center justify-between px-4 py-3.5">
            <span className="font-serif text-base font-semibold text-ink tabular-nums">
              {row.date.slice(0, 10)}
            </span>
            <span className={`chip ${status.className}`}>{status.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
