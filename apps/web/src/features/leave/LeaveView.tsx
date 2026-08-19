'use client';

import { StudentSelect } from '../../components/StudentSelect';
import { SplitColumns } from '../../components/SplitColumns';
import { useSelectedStudent } from '../students/useSelectedStudent';
import { LeaveForm } from './LeaveForm';
import { LeaveList } from './LeaveList';
import { TeacherLeaveReviewPanel } from './TeacherLeaveReviewPanel';
import { SchoolLeaveOverviewPanel } from './SchoolLeaveOverviewPanel';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { SkeletonLines } from '../../components/Skeleton';
import { Band } from '../../components/Band';

// 請假（聯集視圖）：園長／行政看全校待審；老師看班級待審；家長看申請 + 我的紀錄。
// 授權由後端把關。桌面版 /admin/leave 與手機版 /liff/leave 共用這一份（docs/04 §3b）。
//
// 桌面寬螢幕由 SplitColumns 把「待審」與「申請／紀錄」並排，手機由 Band 上下斷句；
// 家長只有申請那一塊，維持單欄（打磨第二階段，Human Owner 2026-08-18）。
export function LeaveView() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  // 待審是校方獨有的一段（家長看不到），所以身分籤貼在這裡是安全的。
  const review = flags.canViewSchoolLeaves ? (
    <Band
      kind="action"
      title="待審核的請假"
      description="全校送上來的申請都在這裡"
      audience="staff"
    >
      <SchoolLeaveOverviewPanel />
    </Band>
  ) : (
    flags.canReviewLeave && (
      <Band
        kind="action"
        title="待審核的請假"
        description="你班上送來的申請，核准或駁回"
        audience="staff"
      >
        <TeacherLeaveReviewPanel />
      </Band>
    )
  );

  // 申請這一區的清單裡，老師帶的班級與他自己的小孩混在一起，而 session 沒帶監護關係
  // —— 判斷不出選到的是不是自己的小孩，所以**不貼身分籤**。
  const apply = flags.canApplyLeave && (
    <>
      <Band kind="action" title="申請請假" description="選孩子與日期，送出後老師會收到">
        <div className="flex flex-col gap-3">
          {isLoading && <SkeletonLines lines={1} />}
          {isError && <p className="text-sm text-stop-text">無法載入學生清單。</p>}
          {students && students.length === 0 && (
            <p className="text-sm text-ink-soft">目前沒有可申請請假的學生。</p>
          )}

          <StudentSelect students={students} value={studentId} onChange={setStudentId} />

          {studentId && <LeaveForm studentId={studentId} />}
        </div>
      </Band>

      {studentId && (
        <Band kind="review" title="請假紀錄" description="送出後在這裡看結果：待審核、已核准或被駁回">
          <LeaveList studentId={studentId} />
        </Band>
      )}
    </>
  );

  if (!flags.canApplyLeave && !flags.canReviewLeave && !flags.canViewSchoolLeaves) {
    return <p className="text-sm text-ink-soft">此功能目前沒有你可操作的項目。</p>;
  }

  return <SplitColumns primary={review} secondary={apply} />;
}
