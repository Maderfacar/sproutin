'use client';

import { SplitColumns } from '../../components/SplitColumns';
import { AnnouncementList } from './AnnouncementList';
import { TeacherAnnouncePanel } from './TeacherAnnouncePanel';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { Band } from '../../components/Band';

// 公告（聯集視圖）：能發公告的人先看到發布面板，其餘只看列表。
// 桌面版 /admin/announcement 與手機版 /liff/announcement 共用這一份（docs/04 §3b）。
//
// 桌面寬螢幕由 SplitColumns 左右分欄（發完就在旁邊看到結果），
// 手機由 Band 上下斷句 —— 兩邊的分界線是同一條（打磨第二階段，Human Owner 2026-08-18）。
export function AnnouncementView() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  return (
    <SplitColumns
      primary={
        flags.canAnnounce && (
          <Band
            kind="action"
            title="發一則公告"
            description={
              flags.canAnnounceSchool ? '可以發給全校，也可以指定單一班級' : '發給你帶的班級'
            }
            audience="staff"
          >
            <TeacherAnnouncePanel />
          </Band>
        )
      }
      secondary={
        <Band
          kind="review"
          title="公告列表"
          description={flags.canAnnounce ? '發出去的公告都留在這裡' : '園所與班級發布的消息'}
        >
          <AnnouncementList />
        </Band>
      }
    />
  );
}
