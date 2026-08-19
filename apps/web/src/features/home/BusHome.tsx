'use client';

import { useSession } from '../../lib/session';
import { SectionHead, Tile } from '../../components/ui';

// 隨車老師的首頁。**只有一格。**
//
// 他的一天就是「這條路線今天的上下車」，做完就關掉 App。
// 給他四個底部頁籤與一堆管理入口只是負擔（Human Owner 2026-08-20：隨車老師不給殼），
// 所以這一頁刻意短到近乎沒有 —— 它存在只是為了讓人一眼看到那唯一的入口在哪。
export function BusHome() {
  const { user } = useSession();

  return (
    <div className="flex flex-col gap-5">
      <SectionHead eyebrow={user.displayName} title="今天的娃娃車" />
      <Tile
        icon="bus"
        title="娃娃車點名"
        detail="今天這條路線的上下車"
        href="/liff/bus"
      />
    </div>
  );
}
