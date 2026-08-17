'use client';

import { RolesOverview } from '../../../../features/people/RolesOverview';

// 桌面版權限設定。與手機版 /liff/admin/roles 共用 RolesOverview（docs/04 §3b）。
export default function AdminRolesPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">權限設定</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          一頁看完誰有什麼身分。身分決定這個人看得到什麼、能做什麼；
          一個人可以有多個身分（例如老師本身也是家長）。點「調整」即可增減。
        </p>
      </header>
      <RolesOverview />
    </div>
  );
}
