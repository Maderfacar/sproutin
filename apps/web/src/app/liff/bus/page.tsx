'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { ParentBus } from '../../../features/bus/ParentBus';
import { BusBoardingPanel } from '../../../features/bus/BusBoardingPanel';

// 娃娃車。同一個網址，依身分決定渲染哪一頁（最後一個聯集視圖 BusView 已退役）：
//   家長＝我小孩今天上下車了沒
//   隨車老師／導師／園長＝今天這一趟的點名
//
// 校方要查「某一個孩子」的娃娃車紀錄時走學生整合視圖（/liff/student/[id]）——
// 那一頁本來就把一個孩子的所有東西放在一起，理由與出缺勤那一刀相同。
// 娃娃車設定的入口在園長首頁的「管理」一段，不在這裡跟今天的事搶位置。
export default function BusPage() {
  const { persona } = useActivePersona();

  if (persona === 'parent') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="娃娃車" />
        <ParentBus />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 隨車老師沒有底部頁籤（他的一天就是這一頁），所以要留返回鍵。 */}
      <PageHeader title="娃娃車點名" />
      <BusBoardingPanel />
    </div>
  );
}
