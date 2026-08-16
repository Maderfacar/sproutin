'use client';

import { PageHeader } from '../../../components/PageHeader';
import { StudentSelect } from '../../../components/StudentSelect';
import { useSelectedStudent } from '../../../features/students/useSelectedStudent';
import { LeaveForm } from '../../../features/leave/LeaveForm';
import { LeaveList } from '../../../features/leave/LeaveList';

// 家長請假頁：選學生（多小孩時）→ 申請 + 查看/取消該學生的請假紀錄。
// 老師/園長也可進入（後端已依 scope 過濾學生）；申請權限由後端把關（園長不可申請）。
export default function LeavePage() {
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="請假" />

      {isLoading && <p className="text-sm text-gray-500">載入學生中…</p>}
      {isError && <p className="text-sm text-red-600">無法載入學生清單。</p>}
      {students && students.length === 0 && (
        <p className="text-sm text-gray-500">目前沒有可申請請假的學生。</p>
      )}

      <StudentSelect students={students} value={studentId} onChange={setStudentId} />

      {studentId && (
        <>
          <LeaveForm studentId={studentId} />
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">請假紀錄</h2>
            <LeaveList studentId={studentId} />
          </section>
        </>
      )}
    </div>
  );
}
