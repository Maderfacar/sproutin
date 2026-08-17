'use client';

import { PageHeader } from '../../../../components/PageHeader';
import { StudentsManager } from '../../../../features/students/StudentsManager';

// 手機版學生管理。內容與桌面版 /admin/students 是同一個元件，只有外框與標題不同（docs/04 §3b）。
export default function StudentsAdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="學生管理" />
      <StudentsManager />
    </div>
  );
}
