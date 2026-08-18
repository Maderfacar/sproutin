'use client';

import { StudentSelect } from '../../components/StudentSelect';
import { SplitColumns } from '../../components/SplitColumns';
import { useSelectedStudent } from '../students/useSelectedStudent';
import { AttendanceList } from './AttendanceList';
import { TeacherRosterPanel } from './TeacherRosterPanel';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { SkeletonLines } from '../../components/Skeleton';

// 出缺勤（聯集視圖）：老師／行政看「點名」；任何看得到學生的人可查詢單一學生每日狀況。
// 桌面版 /admin/attendance 與手機版 /liff/attendance 共用這一份（docs/04 §3b）。
// 桌面寬螢幕上「點名」與「查看」並排（SplitColumns），手機維持上下一欄。
export function AttendanceView() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <SplitColumns
      primary={flags.canMarkAttendance && <TeacherRosterPanel />}
      secondary={
        <section className="flex flex-col gap-3">
          <h2 className="section-title">查看出缺勤</h2>
          {isLoading && <SkeletonLines lines={1} />}
          {isError && <p className="text-sm text-red-600">無法載入學生清單。</p>}
          {students && students.length === 0 && (
            <p className="text-sm text-ink-soft">目前沒有可查看的學生。</p>
          )}
          <StudentSelect students={students} value={studentId} onChange={setStudentId} />
          {studentId && <AttendanceList studentId={studentId} />}
        </section>
      }
    />
  );
}
