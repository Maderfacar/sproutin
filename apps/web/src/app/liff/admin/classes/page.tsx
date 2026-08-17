'use client';

import { PageHeader } from '../../../../components/PageHeader';
import { ClassesManager } from '../../../../features/classes/ClassesManager';

// 手機版班級管理。內容與桌面版 /admin/classes 是同一個元件，只有外框與標題不同（docs/04 §3b）。
export default function ClassesAdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="班級管理" />
      <ClassesManager />
    </div>
  );
}
