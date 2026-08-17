'use client';

import { NotificationList } from '../../../../features/notification/NotificationList';

// 桌面版通知。與手機版 /liff/notification 共用 NotificationList（docs/04 §3b）。
export default function AdminNotificationPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">通知</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          系統送給你的站內通知。這裡看到的和手機上的是同一份。
        </p>
      </header>
      <NotificationList />
    </div>
  );
}
