'use client';

import { PageHeader } from '../../../components/PageHeader';
import { StudentSelect } from '../../../components/StudentSelect';
import { useSelectedStudent } from '../../../features/students/useSelectedStudent';
import { TeacherBookPanel } from '../../../features/communication-book/TeacherBookPanel';
import { StudentBookView } from '../../../features/communication-book/StudentBookView';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';

// 每日聯絡簿（聯集視圖）。老師/行政先看整班記錄面板；任何看得到學生的人都能翻閱該生聯絡簿。
// 聯絡簿是「一個孩子的頁面」：當日狀態在上、親師對話在下，訊息功能已併入此處。
export default function CommunicationBookPage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="聯絡簿" />

      {flags.canMarkAttendance && <TeacherBookPanel />}

      <section className="flex flex-col gap-3">
        {flags.canMarkAttendance && <h2 className="section-title">翻閱單一學生</h2>}
        {isLoading && <p className="text-sm text-ink-soft">載入學生中…</p>}
        {isError && <p className="text-sm text-red-600">無法載入學生清單。</p>}
        {students && students.length === 0 && (
          <p className="text-sm text-ink-soft">目前沒有可查看的學生。</p>
        )}
        <StudentSelect students={students} value={studentId} onChange={setStudentId} />
        {studentId && <StudentBookView studentId={studentId} canEdit={flags.canMarkAttendance} />}
      </section>
    </div>
  );
}
