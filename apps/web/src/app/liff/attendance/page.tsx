'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { AttendanceView } from '../../../features/attendance/AttendanceView';
import { ParentAttendance } from '../../../features/attendance/ParentAttendance';
import { TeacherRoster } from '../../../features/attendance/TeacherRoster';

// 出缺勤。同一個網址，三種身分看到三件事：
//   家長＝我小孩每天的紀錄 + 這個月統計
//   導師＝今天這一班的點名（底部頁籤之一，退無可退 → 不放返回鍵）
//   行政／園長＝仍是共用的 AttendanceView（第四批才改版）
export default function AttendancePage() {
  const { persona } = useActivePersona();

  if (persona === 'parent') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="出缺勤紀錄" />
        <ParentAttendance />
      </div>
    );
  }

  if (persona === 'teacher') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="點名" back={false} />
        <TeacherRoster />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="出缺勤" />
      <AttendanceView />
    </div>
  );
}
