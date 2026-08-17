'use client';

import { AnnouncementView } from '../../../../features/announcement/AnnouncementView';

// 桌面版公告。與手機版 /liff/announcement 共用 AnnouncementView（docs/04 §3b）。
export default function AdminAnnouncementPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">公告</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          發布給全校或單一班級。公告會同時發一則 LINE 卡片通知家長 ——
          要做一張自己排版的卡片請改用「發送訊息」。
        </p>
      </header>
      <AnnouncementView />
    </div>
  );
}
