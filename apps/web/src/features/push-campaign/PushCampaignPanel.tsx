'use client';

import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { StatusScreen } from '../../components/StatusScreen';
import { MessageComposer } from './MessageComposer';
import { CampaignHistory } from './CampaignHistory';
import { Band } from '../../components/Band';

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
    <div>
      <Band
        kind="action"
        title="做一張卡片發出去"
        description="直接送到家長的 LINE。送出後沒有辦法收回，按最後一顆按鈕前會先讓你確認人數"
      >
        <MessageComposer />
      </Band>

      <Band kind="review" title="送出紀錄" description="發過的每一則、送給誰、幾個人收到">
        <CampaignHistory />
      </Band>
    </div>
  );
}
