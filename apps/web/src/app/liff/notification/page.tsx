'use client';

import { PageHeader } from '../../../components/PageHeader';
import { NotificationList } from '../../../features/notification/NotificationList';

// 手機版訊息中心。與桌面版 /admin/notification 共用 NotificationList（docs/04 §3b）。
export default function NotificationPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="訊息中心" />
      <NotificationList />
    </div>
  );
}
