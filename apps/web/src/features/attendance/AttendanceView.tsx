'use client';

import { StudentSelect } from '../../components/StudentSelect';
import { SplitColumns } from '../../components/SplitColumns';
import { useSelectedStudent } from '../students/useSelectedStudent';
import { AttendanceList } from './AttendanceList';
import { TeacherRosterPanel } from './TeacherRosterPanel';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { SkeletonLines } from '../../components/Skeleton';
import { Band } from '../../components/Band';

// 出缺勤（聯集視圖）：老師／行政看「點名」；任何看得到學生的人可查詢單一學生每日狀況。
// 桌面版 /admin/attendance 與手機版 /liff/attendance 共用這一份（docs/04 §3b）。
//
// 版面分兩層，講的是同一件事：桌面寬螢幕由 SplitColumns 左右分欄，
// 手機由 Band 上下斷句 —— 所以 Band 放在 primary／secondary **各自裡面**，
// 兩邊的「要做的事 vs 查看」是同一條分界線（打磨第二階段，Human Owner 2026-08-18）。
export function AttendanceView() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  // 清單裡老師帶的班級與他自己的小孩混在一起，而 session 沒帶監護關係
  // —— 判斷不出選到的是不是自己的小孩，所以這一區不貼身分籤，改用文案講清楚。
  const reviewTitle = flags.isStaff ? '查看單一學生' : '出缺勤紀錄';
  const reviewDescription = flags.hasDualIdentity
    ? '你帶的班級和你自己的小孩都在這個清單裡'
    : flags.isStaff
      ? '選一個孩子，看他每天的出缺勤'
      : '老師點完名這裡就會更新';

  return (
    <SplitColumns
      primary={
        flags.canMarkAttendance && (
          <Band
            kind="action"
            title="今天的點名"
            description="選班級與日期，一個孩子一個狀態"
            audience="staff"
          >
            <TeacherRosterPanel />
          </Band>
        )
      }
      secondary={
        <Band kind="review" title={reviewTitle} description={reviewDescription}>
          <div className="flex flex-col gap-3">
            {isLoading && <SkeletonLines lines={1} />}
            {isError && <p className="text-sm text-red-600">無法載入學生清單。</p>}
            {students && students.length === 0 && (
              <p className="text-sm text-ink-soft">目前沒有可查看的學生。</p>
            )}
            <StudentSelect students={students} value={studentId} onChange={setStudentId} />
            {studentId && <AttendanceList studentId={studentId} />}
          </div>
        </Band>
      }
    />
  );
}
