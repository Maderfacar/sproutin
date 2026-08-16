'use client';

import { PageHeader } from '../../../components/PageHeader';
import { NotificationList } from '../../../features/notification/NotificationList';

export default function NotificationPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="通知" />
      <NotificationList />
    </div>
  );
}
