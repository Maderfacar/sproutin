'use client';

import { PageHeader } from '../../../../components/PageHeader';
import { RolesOverview } from '../../../../features/people/RolesOverview';

// 手機版權限設定。與桌面版 /admin/roles 共用 RolesOverview（docs/04 §3b）。
export default function RolesAdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="權限設定" />
      <p className="rise-in text-sm leading-relaxed text-ink-soft">
        一頁看完誰有什麼身分。一個人可以有多個身分（例如老師本身也是家長）。
      </p>
      <RolesOverview />
    </div>
  );
}
