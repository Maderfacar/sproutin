'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon } from '../../../../../components/Icon';
import { StudentDetail } from '../../../../../features/students/StudentDetail';

// 桌面版學生整合視圖。與手機版 /liff/student/[id] 共用 StudentDetail（docs/04 §3b）。
//
// 這一頁補回了桌面版娃娃車設定的最後一段：路線與接送點在 /admin/bus 設定，
// 「這個孩子在哪裡上下車」是學生的屬性，所以在這裡指派。少了這一頁，那條流程走不完。
//
// 標題就是孩子的名字（在元件裡），所以外框只給一條回上一層的路。
export default function AdminStudentDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink"
      >
        <Icon name="chev" className="h-4 w-4 rotate-180" />
        學生管理
      </Link>
      <StudentDetail studentId={params.id} />
    </div>
  );
}
