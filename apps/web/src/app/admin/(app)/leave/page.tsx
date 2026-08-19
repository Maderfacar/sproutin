'use client';

import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';
import { LeaveReview } from '../../../../features/leave/LeaveReview';

// 桌面版請假。與手機版 /liff/leave 共用 LeaveReview（docs/04 §3b）。
//
// 家長不進電腦版（§3b 明文例外），所以這一頁只有審核 —— 外加「代家長請假」，
// 因為家長打電話來請假是實際會發生的事。
export default function AdminLeavePage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">請假審核</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          園長與行政看全校待審，老師看自己班上的。核准之後出缺勤與娃娃車名單會自動跟著改。
        </p>
      </header>
      <LeaveReview scope={flags.canViewSchoolLeaves ? 'school' : 'class'} />
    </div>
  );
}
