'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/PageHeader';
import { StudentBookScreen } from '../../../../features/communication-book/CommunicationBookView';
import { useStudentName } from '../../../../features/students/useSelectedStudent';

// 手機版單一學生聯絡簿。與桌面版 /admin/communication-book/[studentId] 共用（docs/04 §3b）。
export default function StudentBookPage() {
  const params = useParams<{ studentId: string }>();
  const name = useStudentName(params.studentId);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={name ? `${name} 的聯絡簿` : '聯絡簿'} />
      <StudentBookScreen studentId={params.studentId} />
    </div>
  );
}
