'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { StatusScreen } from '../../components/StatusScreen';
import { Icon } from '../../components/Icon';
import { Button, SectionHead, Sheet } from '../../components/ui';
import { MessageComposer } from './MessageComposer';
import { CampaignHistory } from './CampaignHistory';

// 群發訊息：一顆按鈕開始寫，頁面主體是**送出紀錄**。
// 只有園長／行政能用（群發會產生費用且送出後無法收回，不下放給老師）；
// 前端這一層只決定顯示，真正的授權在後端 Guard。
//
// 為什麼編輯器收進底部面板（清葉加厚，2026-08-20）：舊版把整張卡片編輯器攤在頁面最上面，
// 於是「上次那則到底送出去了沒、幾個人收到」要先捲過一整份表單才看得到 ——
// 而群發送出後無法收回，**回頭查帳的次數其實比新發一則還多**。
//
// 桌面版 /admin/messages 與手機版 /liff/admin/messages 共用這一份（docs/04 §3b）。
export function PushCampaignPanel() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const [composing, setComposing] = useState(false);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以發送群發訊息。" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <Button variant="primary" onClick={() => setComposing(true)}>
        <Icon name="send" className="h-5 w-5" />
        發一則群發訊息
      </Button>

      {/* 「收不回來」這句話留在按鈕旁邊。寫在頁面最上面的警語在手機上會先被捲掉，
          而要被提醒的那一刻正是手指停在按鈕上的那一刻。 */}
      <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        送出後沒有辦法收回，每一則都會計入 LINE 的推播用量。按最後一顆按鈕前會先讓你確認人數。
      </p>

      {/* 面板一直掛著（不是 composing && …）：草稿要留住。
          寫到一半誤觸背景或 Esc 就把整張卡片清掉，比多發一支人數預估的請求糟得多。 */}
      <Sheet open={composing} title="發一則群發訊息" onClose={() => setComposing(false)}>
        <MessageComposer onClose={() => setComposing(false)} />
      </Sheet>

      <section>
        <SectionHead
          title="送出紀錄"
          description="發過的每一則、送給誰、幾個人收到"
          weight="review"
        />
        <CampaignHistory />
      </section>
    </div>
  );
}
