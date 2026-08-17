'use client';

import { AnnouncementList } from './AnnouncementList';
import { TeacherAnnouncePanel } from './TeacherAnnouncePanel';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';

// 公告（聯集視圖）：能發公告的人先看到發布面板，其餘只看列表。
// 桌面版 /admin/announcement 與手機版 /liff/announcement 共用這一份（docs/04 §3b）。
export function AnnouncementView() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  return (
    <div className="flex flex-col gap-5">
      {flags.canAnnounce && <TeacherAnnouncePanel />}

      <section className="flex flex-col gap-3">
        <h2 className="section-title">公告列表</h2>
        <AnnouncementList />
      </section>
    </div>
  );
}
