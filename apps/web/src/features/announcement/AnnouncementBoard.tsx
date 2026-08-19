'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { AnnouncementList } from './AnnouncementList';
import { AnnounceSheet } from './AnnounceSheet';
import { Button, SectionHead } from '../../components/ui';
import { Icon } from '../../components/Icon';

// 公告。家長只讀（一份列表），能發公告的人多一顆按鈕。
//
// 舊版是「發布面板」在上、「公告列表」在下，兩塊都常駐。但即使是老師，
// 進這一頁十次有九次是來看有沒有新的 —— 發布是例外，所以收進底部面板。
//
// 桌面版 /admin/announcement 與手機版 /liff/announcement 共用這一份（docs/04 §3b）。
export function AnnouncementBoard() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {flags.canAnnounce && (
        <>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Icon name="mega" className="h-5 w-5" />
            發一則公告
          </Button>
          <AnnounceSheet open={open} onClose={() => setOpen(false)} />
        </>
      )}

      <section>
        <SectionHead
          title="公告"
          description={flags.canAnnounce ? '發出去的公告都留在這裡' : '園所與班級發布的消息'}
          weight="review"
        />
        <AnnouncementList />
      </section>
    </div>
  );
}
