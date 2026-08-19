'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { LeaveView } from '../../../features/leave/LeaveView';
import { ParentLeave } from '../../../features/leave/ParentLeave';

// 請假。家長看到的是「申請 + 我的紀錄」，校方看到的是「待審核」——
// 同一個網址，依身分決定渲染哪一頁（不再把兩塊疊在同一頁靠標籤區分）。
//
// 校方那一邊在第三、四批才改版，現在仍是共用的 LeaveView（與桌面 /admin/leave 同一份）。
export default function LeavePage() {
  const { persona } = useActivePersona();
  const isParent = persona === 'parent';

  return (
    <div className="flex flex-col gap-5">
      {/* 家長的請假是底部頁籤之一（最上層，退無可退）→ 不放返回鍵。 */}
      <PageHeader title="請假" back={!isParent} />
      {isParent ? <ParentLeave /> : <LeaveView />}
    </div>
  );
}
