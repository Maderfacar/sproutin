'use client';

import { useAttendance } from './hooks';
import { ATTENDANCE_STATUS_LABEL } from './labels';
import { apiErrorMessage } from '../../lib/api';
import type { AttendanceView } from '../../lib/types';

function byDateDesc(a: AttendanceView, b: AttendanceView): number {
  return b.date.localeCompare(a.date);
}

// 家長出缺勤:依日期清單（Human Owner 決策）。唯讀。
export function AttendanceList({ studentId }: { studentId: string }) {
  const { data, isLoading, isError, error } = useAttendance(studentId);

  if (isLoading) {
    return <p className="text-sm text-gray-500">載入出缺勤中…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">目前沒有出缺勤紀錄。</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {[...data].sort(byDateDesc).map((row) => {
        const status = ATTENDANCE_STATUS_LABEL[row.status];
        return (
          <li
            key={row.id}
            className="flex items-center justify-between rounded-card border border-gray-200 bg-white px-4 py-3"
          >
            <span className="text-gray-900">{row.date.slice(0, 10)}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
