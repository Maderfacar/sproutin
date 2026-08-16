'use client';

import { PageHeader } from '../../../components/PageHeader';
import { StudentSelect } from '../../../components/StudentSelect';
import { useSelectedStudent } from '../../../features/students/useSelectedStudent';
import { LeaveForm } from '../../../features/leave/LeaveForm';
import { LeaveList } from '../../../features/leave/LeaveList';
import { TeacherLeaveReviewPanel } from '../../../features/leave/TeacherLeaveReviewPanel';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';

// 請假頁（聯集視圖）:老師/行政看「待審核」;家長看「申請 + 我的紀錄」。一人多角色兩者皆見。
// 授權由後端把關（園長不可申請/審核 → 不顯示對應面板）。
export default function LeavePage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="請假" />

      {flags.canReviewLeave && <TeacherLeaveReviewPanel />}

      {flags.isGuardian && (
        <>
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
        </>
      )}

      {!flags.isGuardian && !flags.canReviewLeave && (
        <p className="text-sm text-gray-500">此功能目前沒有你可操作的項目。</p>
      )}
    </div>
  );
}
