'use client';

import { PageHeader } from '../../../components/PageHeader';
import { StudentSelect } from '../../../components/StudentSelect';
import { useSelectedStudent } from '../../../features/students/useSelectedStudent';
import { MessageThread } from '../../../features/message/MessageThread';

export default function MessagePage() {
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="訊息" />

      {isLoading && <p className="text-sm text-ink-soft">載入學生中…</p>}
      {isError && <p className="text-sm text-red-600">無法載入學生清單。</p>}
      {students && students.length === 0 && (
        <p className="text-sm text-ink-soft">目前沒有可溝通的學生。</p>
      )}

      <StudentSelect students={students} value={studentId} onChange={setStudentId} />
      {studentId && <MessageThread studentId={studentId} />}
    </div>
  );
}
