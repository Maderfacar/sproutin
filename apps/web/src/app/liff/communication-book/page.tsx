'use client';

import { PageHeader } from '../../../components/PageHeader';
import { CommunicationBookView } from '../../../features/communication-book/CommunicationBookView';

// 手機版聯絡簿。與桌面版 /admin/communication-book 共用 CommunicationBookView（docs/04 §3b）。
export default function CommunicationBookPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="聯絡簿" />
      <CommunicationBookView />
    </div>
  );
}
