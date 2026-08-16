'use client';

import { PageHeader } from '../../../components/PageHeader';
import { AnnouncementList } from '../../../features/announcement/AnnouncementList';
import { TeacherAnnouncePanel } from '../../../features/announcement/TeacherAnnouncePanel';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';

// 公告頁（聯集視圖）:staff 可發班級公告;所有人看可見公告清單。
export default function AnnouncementPage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="公告" />

      {flags.canAnnounce && <TeacherAnnouncePanel />}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-gray-900">公告列表</h2>
        <AnnouncementList />
      </section>
    </div>
  );
}
