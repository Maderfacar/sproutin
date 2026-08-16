'use client';

import { PageHeader } from '../../../components/PageHeader';
import { StudentSelect } from '../../../components/StudentSelect';
import { useSelectedStudent } from '../../../features/students/useSelectedStudent';
import { LeaveForm } from '../../../features/leave/LeaveForm';
import { LeaveList } from '../../../features/leave/LeaveList';
import { TeacherLeaveReviewPanel } from '../../../features/leave/TeacherLeaveReviewPanel';
import { SchoolLeaveOverviewPanel } from '../../../features/leave/SchoolLeaveOverviewPanel';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';

// 請假頁（聯集視圖）:園長/行政看全校待審;老師看班級待審;家長看申請 + 我的紀錄。授權由後端把關。
export default function LeavePage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="請假" />

      {flags.canViewSchoolLeaves ? (
        <SchoolLeaveOverviewPanel />
      ) : (
        flags.canReviewLeave && <TeacherLeaveReviewPanel />
      )}

      {flags.canApplyLeave && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">申請請假</h2>
          {isLoading && <p className="text-sm text-ink-soft">載入學生中…</p>}
          {isError && <p className="text-sm text-red-600">無法載入學生清單。</p>}
          {students && students.length === 0 && (
            <p className="text-sm text-ink-soft">目前沒有可申請請假的學生。</p>
          )}

          <StudentSelect students={students} value={studentId} onChange={setStudentId} />

          {studentId && (
            <>
              <LeaveForm studentId={studentId} />
              <div className="flex flex-col gap-3">
                <h3 className="section-title">請假紀錄</h3>
                <LeaveList studentId={studentId} />
              </div>
            </>
          )}
        </section>
      )}

      {!flags.canApplyLeave && !flags.canReviewLeave && !flags.canViewSchoolLeaves && (
        <p className="text-sm text-ink-soft">此功能目前沒有你可操作的項目。</p>
      )}
    </div>
  );
}
