'use client';

import { PageHeader } from '../../../components/PageHeader';
import { AnnouncementBoard } from '../../../features/announcement/AnnouncementBoard';

// 公告。家長只讀，能發公告的人多一顆按鈕 —— 差別由 AnnouncementBoard 內部依角色決定。
export default function AnnouncementPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="公告" />
      <AnnouncementBoard />
    </div>
  );
}
