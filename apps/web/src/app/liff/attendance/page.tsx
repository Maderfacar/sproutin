'use client';

import { PageHeader } from '../../../components/PageHeader';
import { AttendanceView } from '../../../features/attendance/AttendanceView';

// 手機版出缺勤。與桌面版 /admin/attendance 共用 AttendanceView（docs/04 §3b）。
export default function AttendancePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="出缺勤" />
      <AttendanceView />
    </div>
  );
}
