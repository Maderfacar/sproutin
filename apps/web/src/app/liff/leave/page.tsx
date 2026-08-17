'use client';

import { PageHeader } from '../../../components/PageHeader';
import { LeaveView } from '../../../features/leave/LeaveView';

// 手機版請假。與桌面版 /admin/leave 共用 LeaveView（docs/04 §3b）。
export default function LeavePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="請假" />
      <LeaveView />
    </div>
  );
}
