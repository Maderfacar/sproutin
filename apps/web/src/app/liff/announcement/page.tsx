'use client';

import { PageHeader } from '../../../components/PageHeader';
import { AnnouncementView } from '../../../features/announcement/AnnouncementView';

// 手機版公告。與桌面版 /admin/announcement 共用 AnnouncementView（docs/04 §3b）。
export default function AnnouncementPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="公告" />
      <AnnouncementView />
    </div>
  );
}
