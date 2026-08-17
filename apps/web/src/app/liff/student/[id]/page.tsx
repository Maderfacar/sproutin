'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/PageHeader';
import { StudentDetail } from '../../../../features/students/StudentDetail';

// 手機版學生整合視圖。內容與桌面版 /admin/students/[id] 是同一個元件（docs/04 §3b）。
export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <PageHeader title="學生資料" />
      <StudentDetail studentId={params.id} />
    </div>
  );
}
