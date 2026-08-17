'use client';

import { PageHeader } from '../../../../components/PageHeader';
import { PushCampaignPanel } from '../../../../features/push-campaign/PushCampaignPanel';

// 手機版發送訊息。與桌面版 /admin/messages 共用 PushCampaignPanel（docs/04 §3b）。
// 園長不見得坐在電腦前 —— 停課、颱風這類最需要群發的時刻，往往人不在辦公室。
export default function MessagesAdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="發送訊息" />
      <p className="rise-in text-sm leading-relaxed text-ink-soft">
        做一張卡片，直接送到家長的 LINE。送出後無法收回，送出前會先讓你確認會送給幾個人。
      </p>
      <PushCampaignPanel />
    </div>
  );
}
