'use client';

import { LeaveView } from '../../../../features/leave/LeaveView';

// 桌面版請假。與手機版 /liff/leave 共用 LeaveView（docs/04 §3b）。
export default function AdminLeavePage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">請假</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          園長與行政看全校待審，老師看自己班上的。核准之後出缺勤與娃娃車名單會自動跟著改。
        </p>
      </header>
      <LeaveView />
    </div>
  );
}
