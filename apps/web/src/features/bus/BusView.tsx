'use client';

import { StudentSelect } from '../../components/StudentSelect';
import { SurfaceLink } from '../../components/SurfaceLink';
import { useSelectedStudent } from '../students/useSelectedStudent';
import { BusBoardingPanel } from './BusBoardingPanel';
import { BusTodayCard } from './BusTodayCard';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { SkeletonLines } from '../../components/Skeleton';

// 娃娃車（聯集視圖，與出缺勤同一種結構）：
//   隨車老師／園所 → 點名；能看到學生的人 → 該孩子的今日狀態。
// 一人身兼兩職時兩塊都會出現（docs/05 §5 多角色取聯集）。
// 桌面版 /admin/bus-roster 與手機版 /liff/bus 共用這一份（docs/04 §3b）。
export function BusView() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  return (
    <div className="flex flex-col gap-6">
      {flags.canMarkBusRide && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">今日點名</h2>
          <BusBoardingPanel />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="section-title">今日狀態</h2>
        {isLoading && <SkeletonLines lines={1} />}
        {isError && <p className="text-sm text-red-700">無法載入學生清單。</p>}
        {students && students.length === 0 && (
          <p className="text-sm text-ink-soft">目前沒有可查看的學生。</p>
        )}
        <StudentSelect students={students} value={studentId} onChange={setStudentId} />
        {studentId && <BusTodayCard studentId={studentId} />}
      </section>

      {flags.canManageSchool && (
        <SurfaceLink href="/liff/admin/bus" className="btn-secondary text-center text-sm">
          娃娃車設定（路線與接送點）
        </SurfaceLink>
      )}
    </div>
  );
}
