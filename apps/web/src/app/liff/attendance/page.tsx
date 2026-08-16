'use client';

import { PageHeader } from '../../../components/PageHeader';
import { StudentSelect } from '../../../components/StudentSelect';
import { useSelectedStudent } from '../../../features/students/useSelectedStudent';
import { AttendanceList } from '../../../features/attendance/AttendanceList';
import { TeacherRosterPanel } from '../../../features/attendance/TeacherRosterPanel';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';

// 出缺勤頁（聯集視圖）:老師/行政看「點名」;任何能看到學生的人（家長自己小孩 / 老師自班 / 園長全校）可查詢單一學生每日狀況。
export default function AttendancePage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="出缺勤" />

      {flags.canMarkAttendance && <TeacherRosterPanel />}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-gray-900">查看出缺勤</h2>
        {isLoading && <p className="text-sm text-gray-500">載入學生中…</p>}
        {isError && <p className="text-sm text-red-600">無法載入學生清單。</p>}
        {students && students.length === 0 && (
          <p className="text-sm text-gray-500">目前沒有可查看的學生。</p>
        )}
        <StudentSelect students={students} value={studentId} onChange={setStudentId} />
        {studentId && <AttendanceList studentId={studentId} />}
      </section>
    </div>
  );
}
