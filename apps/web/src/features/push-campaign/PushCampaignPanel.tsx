'use client';

import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { StatusScreen } from '../../components/StatusScreen';
import { MessageComposer } from './MessageComposer';
import { CampaignHistory } from './CampaignHistory';

// 群發訊息：做一張卡片 → 確認人數 → 送出，下面是送出紀錄。
// 只有園長／行政能用（群發會產生費用且送出後無法收回，不下放給老師）；
// 前端這一層只決定顯示，真正的授權在後端 Guard。
//
// 桌面版 /admin/messages 與手機版 /liff/admin/messages 共用這一份（docs/04 §3b）。
export function PushCampaignPanel() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以發送群發訊息。" />;
  }

  return (
    <div className="space-y-7">
      <MessageComposer />
      <CampaignHistory />
    </div>
  );
}
