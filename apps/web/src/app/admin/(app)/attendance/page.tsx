'use client';

import { AttendanceView } from '../../../../features/attendance/AttendanceView';

// 桌面版出缺勤。與手機版 /liff/attendance 共用 AttendanceView（docs/04 §3b）。
export default function AdminAttendancePage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">出缺勤</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          點名，以及查詢單一學生的每日出席狀況。請假核准之後會自動記成請假，不必再點一次。
        </p>
      </header>
      <AttendanceView />
    </div>
  );
}
