'use client';

import { NotificationList } from '../../../../features/notification/NotificationList';

// 桌面版訊息中心。與手機版 /liff/notification 共用 NotificationList（docs/04 §3b）。
export default function AdminNotificationPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">訊息中心</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          公告、老師的留言、請假結果都會收在這裡。每一則點進去會回到它原本那一頁；這裡看到的和手機上的是同一份。
        </p>
      </header>
      <NotificationList />
    </div>
  );
}
