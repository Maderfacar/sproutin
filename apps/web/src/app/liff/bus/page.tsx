'use client';

import { PageHeader } from '../../../components/PageHeader';
import { BusView } from '../../../features/bus/BusView';

// 手機版娃娃車（點名 + 今日狀態）。與桌面版 /admin/bus-roster 共用 BusView（docs/04 §3b）。
export default function BusPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="娃娃車" />
      <BusView />
    </div>
  );
}
