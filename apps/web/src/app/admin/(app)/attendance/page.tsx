'use client';

import { TeacherRoster } from '../../../../features/attendance/TeacherRoster';

// 桌面版出缺勤。與手機版 /liff/attendance 共用 TeacherRoster（docs/04 §3b）。
//
// 家長不進電腦版（§3b 明文例外），所以這一頁就是點名。
// 要查某一個孩子的紀錄走學生整合視圖 /admin/students/[id]。
export default function AdminAttendancePage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">點名</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          打開就是今天這一班。剩下沒點的可以一次全部標「到校」，之後只處理例外。
        </p>
      </header>
      <TeacherRoster />
    </div>
  );
}
