'use client';

import { PageHeader } from '../../../components/PageHeader';
import { AnnouncementList } from '../../../features/announcement/AnnouncementList';
import { TeacherAnnouncePanel } from '../../../features/announcement/TeacherAnnouncePanel';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';

export default function AnnouncementPage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="公告" />

      {flags.canAnnounce && <TeacherAnnouncePanel />}

      <section className="flex flex-col gap-3">
        <h2 className="section-title">公告列表</h2>
        <AnnouncementList />
      </section>
    </div>
  );
}
