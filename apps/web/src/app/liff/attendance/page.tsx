'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { AttendanceView } from '../../../features/attendance/AttendanceView';
import { ParentAttendance } from '../../../features/attendance/ParentAttendance';

// 出缺勤。家長看到的是「我小孩每天的紀錄 + 這個月統計」，
// 老師看到的是「今天這一班的點名」——同一個網址，依身分決定渲染哪一頁。
//
// 老師那一邊在第三批改版，現在仍是共用的 AttendanceView（與桌面 /admin/attendance 同一份）。
export default function AttendancePage() {
  const { persona } = useActivePersona();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={persona === 'parent' ? '出缺勤紀錄' : '出缺勤'} />
      {persona === 'parent' ? <ParentAttendance /> : <AttendanceView />}
    </div>
  );
}
