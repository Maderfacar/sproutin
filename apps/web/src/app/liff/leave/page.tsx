'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { ParentLeave } from '../../../features/leave/ParentLeave';
import { LeaveReview } from '../../../features/leave/LeaveReview';

// 請假。同一個網址，依身分決定渲染哪一頁：
//   家長＝申請 + 我的紀錄（底部頁籤之一 → 不放返回鍵）
//   導師＝這一班等你決定的申請
//   行政／園長＝全校等你決定的申請
export default function LeavePage() {
  const { persona } = useActivePersona();

  if (persona === 'parent') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="請假" back={false} />
        <ParentLeave />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="請假審核" back={persona !== 'teacher'} />
      <LeaveReview scope={persona === 'staff' ? 'school' : 'class'} />
    </div>
  );
}
