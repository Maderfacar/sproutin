'use client';

import { BusBoardingPanel } from '../../../../features/bus/BusBoardingPanel';

// 桌面版娃娃車點名。與手機版 /liff/bus 共用 BusBoardingPanel（docs/04 §3b）。
//
// 網址刻意不放在 /admin/bus 之下：那是「設定」，這是「今天車上發生的事」，
// 兩者放在一起會讓左側導覽同時亮兩條。
//
// 點名本身是車上的事（隨車老師拿手機點），這一頁在電腦上的用途是園所看得到今天誰上了車。
export default function AdminBusRosterPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">娃娃車點名</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          今天誰上了車、誰還沒。實際點名是隨車老師在車上用手機做的，這裡看得到同一份名單。
          請假的孩子會自動從名單移出，並另外標示人數。
        </p>
      </header>
      <BusBoardingPanel />
    </div>
  );
}
