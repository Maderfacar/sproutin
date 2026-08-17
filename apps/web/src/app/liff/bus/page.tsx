'use client';

import Link from 'next/link';
import { PageHeader } from '../../../components/PageHeader';
import { StudentSelect } from '../../../components/StudentSelect';
import { useSelectedStudent } from '../../../features/students/useSelectedStudent';
import { BusBoardingPanel } from '../../../features/bus/BusBoardingPanel';
import { BusTodayCard } from '../../../features/bus/BusTodayCard';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';

// 娃娃車（聯集視圖，與出缺勤同一種結構）：
//   隨車老師／園所 → 點名；能看到學生的人 → 該孩子的今日狀態。
// 一人身兼兩職時兩塊都會出現（docs/05 §5 多角色取聯集）。
export default function BusPage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="娃娃車" />

      {flags.canMarkBusRide && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">今日點名</h2>
          <BusBoardingPanel />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="section-title">今日狀態</h2>
        {isLoading && <p className="text-sm text-ink-soft">載入學生中…</p>}
        {isError && <p className="text-sm text-red-700">無法載入學生清單。</p>}
        {students && students.length === 0 && (
          <p className="text-sm text-ink-soft">目前沒有可查看的學生。</p>
        )}
        <StudentSelect students={students} value={studentId} onChange={setStudentId} />
        {studentId && <BusTodayCard studentId={studentId} />}
      </section>

      {flags.canManageSchool && (
        <Link href="/liff/admin/bus" className="btn-secondary text-center text-sm">
          娃娃車設定（路線與接送點）
        </Link>
      )}
    </div>
  );
}
