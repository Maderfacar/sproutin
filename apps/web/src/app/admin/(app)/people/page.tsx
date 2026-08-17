'use client';

import { PeopleManager } from '../../../../features/people/PeopleManager';

// 桌面版人員管理。與手機版 /liff/admin/people 共用 PeopleManager，只有標題排版不同。
export default function AdminPeoplePage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">人員與綁定</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          新增老師、行政與家長帳號，指派任教班級或綁定孩子，並發給他們登入用的綁定碼。
        </p>
      </header>
      <PeopleManager />
    </div>
  );
}
