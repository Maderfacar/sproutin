'use client';

import { PageHeader } from '../../../components/PageHeader';
import { ClassRoster } from '../../../features/classes/ClassRoster';

// 導師的「我的班」：班級名單 + 每個孩子今天的狀態。從首頁進來，所以保留返回鍵。
export default function ClassRosterPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="我的班" />
      <ClassRoster />
    </div>
  );
}
