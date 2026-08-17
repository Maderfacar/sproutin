'use client';

import { PageHeader } from '../../../../components/PageHeader';
import { PeopleManager } from '../../../../features/people/PeopleManager';

// 手機版人員管理。內容與桌面版 /admin/people 是同一個元件，只有外框與標題不同。
export default function PeopleAdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="人員管理" />
      <PeopleManager />
    </div>
  );
}
