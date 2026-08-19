'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { LeaveView } from '../../../features/leave/LeaveView';
import { ParentLeave } from '../../../features/leave/ParentLeave';
import { TeacherLeaveReview } from '../../../features/leave/TeacherLeaveReview';

// 請假。同一個網址，三種身分看到三件事：
//   家長＝申請 + 我的紀錄（底部頁籤之一 → 不放返回鍵）
//   導師＝這一班等你決定的申請
//   行政／園長＝仍是共用的 LeaveView（第四批才改版：全校待審）
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

  if (persona === 'teacher') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="請假審核" />
        <TeacherLeaveReview />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="請假" />
      <LeaveView />
    </div>
  );
}
