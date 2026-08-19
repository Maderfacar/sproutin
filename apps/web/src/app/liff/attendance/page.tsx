'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { StudentAttendance } from '../../../features/attendance/StudentAttendance';
import { TeacherRoster } from '../../../features/attendance/TeacherRoster';

// 出缺勤。同一個網址，依身分決定渲染哪一頁：
//   家長＝我小孩每天的紀錄 + 這個月統計
//   導師＝今天這一班的點名（底部頁籤之一，退無可退 → 不放返回鍵）
//   行政／園長＝點名（園長首頁的「還沒點完名」就是連到這裡來補的）
//
// 校方要查「某一個孩子」的出缺勤時走學生整合視圖（/liff/student/[id]）——
// 那一頁本來就把一個孩子的所有東西放在一起，不必在這裡再開一段。
export default function AttendancePage() {
  const { persona } = useActivePersona();

  if (persona === 'parent') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="出缺勤紀錄" />
        <StudentAttendance />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="點名" back={persona !== 'teacher'} />
      <TeacherRoster />
    </div>
  );
}
