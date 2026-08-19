'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { AnnouncementView } from '../../../features/announcement/AnnouncementView';
import { AnnouncementList } from '../../../features/announcement/AnnouncementList';

// 公告。家長只讀，所以就是一份列表 —— 不用再包一層「公告列表」的標題講一次頁面自己的名字。
// 校方多一塊「發一則公告」，在第三、四批才改版。
export default function AnnouncementPage() {
  const { persona } = useActivePersona();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="公告" />
      {persona === 'parent' ? <AnnouncementList /> : <AnnouncementView />}
    </div>
  );
}
