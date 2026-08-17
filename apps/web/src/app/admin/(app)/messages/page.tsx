'use client';

import { PushCampaignPanel } from '../../../../features/push-campaign/PushCampaignPanel';

// 發送訊息（桌面後台）。獨立一頁 —— 群發不可收回且會產生費用，不該和其他日常操作擠在一起。
// 與手機版 /liff/admin/messages 共用 PushCampaignPanel（docs/04 §3b）。
export default function AdminMessagesPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">發送訊息</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          做一張卡片，直接送到家長的 LINE。選版型、填空、確認人數，就送出去了。
        </p>
      </header>
      <PushCampaignPanel />
    </div>
  );
}
