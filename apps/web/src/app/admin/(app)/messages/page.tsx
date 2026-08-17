'use client';

import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';
import { StatusScreen } from '../../../../components/StatusScreen';
import { MessageComposer } from '../../../../features/push-campaign/MessageComposer';
import { CampaignHistory } from '../../../../features/push-campaign/CampaignHistory';

// 發送訊息（桌面後台）。獨立一頁 —— 群發不可收回且會產生費用，不該和其他日常操作擠在一起。
//
// 只有園長／行政進得來（老師不行）。前端這一層只決定顯示，真正的授權在後端 Guard。
export default function AdminMessagesPage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以發送群發訊息。" />;
  }

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">發送訊息</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          做一張卡片，直接送到家長的 LINE。選版型、填空、確認人數，就送出去了。
        </p>
      </header>

      <MessageComposer />
      <CampaignHistory />
    </div>
  );
}
