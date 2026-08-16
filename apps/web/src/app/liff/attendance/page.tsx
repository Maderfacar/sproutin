'use client';

import { PageHeader } from '../../../components/PageHeader';
import { StudentSelect } from '../../../components/StudentSelect';
import { useSelectedStudent } from '../../../features/students/useSelectedStudent';
import { AttendanceList } from '../../../features/attendance/AttendanceList';

export default function AttendancePage() {
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="出缺勤" />

      {isLoading && <p className="text-sm text-gray-500">載入學生中…</p>}
      {isError && <p className="text-sm text-red-600">無法載入學生清單。</p>}
      {students && students.length === 0 && (
        <p className="text-sm text-gray-500">目前沒有可查看的學生。</p>
      )}

      <StudentSelect students={students} value={studentId} onChange={setStudentId} />
      {studentId && <AttendanceList studentId={studentId} />}
    </div>
  );
}
