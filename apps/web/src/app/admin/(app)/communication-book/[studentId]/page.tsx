'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon } from '../../../../../components/Icon';
import { StudentBookScreen } from '../../../../../features/communication-book/StudentBookScreen';
import { useStudentName } from '../../../../../features/students/useSelectedStudent';

// 桌面版單一學生聯絡簿。與手機版 /liff/communication-book/[studentId] 共用（docs/04 §3b）。
export default function AdminStudentBookPage() {
  const params = useParams<{ studentId: string }>();
  const name = useStudentName(params.studentId);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/communication-book"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink"
      >
        <Icon name="chev" className="h-4 w-4 rotate-180" />
        聯絡簿
      </Link>
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
        {name ? `${name} 的聯絡簿` : '聯絡簿'}
      </h1>
      <StudentBookScreen studentId={params.studentId} />
    </div>
  );
}
