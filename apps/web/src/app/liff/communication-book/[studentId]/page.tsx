'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/PageHeader';
import { StudentBookView } from '../../../../features/communication-book/StudentBookView';
import { useMyStudents } from '../../../../lib/queries';
import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';

// 單一學生的聯絡簿（老師從直欄模式點進來、家長從首頁摘要點進來）。
// 授權完全由後端決定：老師只開得了自班學生、家長只開得了自己小孩。
export default function StudentBookPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: students } = useMyStudents();

  const student = students?.find((s) => s.id === studentId);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={student ? `${student.name} 的聯絡簿` : '聯絡簿'} />
      <StudentBookView studentId={studentId} canEdit={flags.canMarkAttendance} />
    </div>
  );
}
