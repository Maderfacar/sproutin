'use client';

import { PageHeader } from '../../../components/PageHeader';
import { AnnouncementList } from '../../../features/announcement/AnnouncementList';

export default function AnnouncementPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="公告" />
      <AnnouncementList />
    </div>
  );
}
