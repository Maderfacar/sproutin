'use client';

import { PageHeader } from '../../../components/PageHeader';
import { AuditPanel } from '../../../features/audit/AuditPanel';

// 手機版稽核查詢。與桌面版 /admin/audit 共用 AuditPanel（docs/04 §3b）。
export default function AuditPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="稽核查詢" />
      <AuditPanel />
    </div>
  );
}
