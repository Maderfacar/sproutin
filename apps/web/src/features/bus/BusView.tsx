'use client';

import { StudentSelect } from '../../components/StudentSelect';
import { SurfaceLink } from '../../components/SurfaceLink';
import { useSelectedStudent } from '../students/useSelectedStudent';
import { BusBoardingPanel } from './BusBoardingPanel';
import { BusTodayCard } from './BusTodayCard';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { SkeletonLines } from '../../components/Skeleton';
import { Band } from '../../components/Band';

// 娃娃車（聯集視圖，與出缺勤同一種結構）：
//   隨車老師／園所 → 點名；能看到學生的人 → 該孩子的今日狀態。
// 一人身兼兩職時兩塊都會出現（docs/05 §5 多角色取聯集）。
// 桌面版 /admin/bus-roster 與手機版 /liff/bus 共用這一份（docs/04 §3b）。
//
// 打磨第二階段（Human Owner 2026-08-18）：改用 components/Band 斷句 ——
// 隨車老師的點名（今天要做的事）在最上面且份量最重，翻閱查詢次之，
// 設定入口最後（那是偶爾才動一次的東西，不該跟今天的事搶位置）。
export function BusView() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  // 這個清單裡，隨車老師負責的孩子與他自己的小孩是混在一起的，而 session 的 AuthUser
  // 沒有帶監護關係 —— 前端判斷不出選到的是不是自己的小孩，所以這一區**不貼身分籤**
  //（貼了就有貼錯的一半），改用文案講清楚。
  const reviewTitle = flags.isStaff ? '查看單一學生' : '今天的娃娃車';
  const reviewDescription = flags.hasDualIdentity
    ? '你車上的孩子和你自己的小孩都在這個清單裡'
    : flags.isStaff
      ? '選一個孩子，看他今天上下車了沒'
      : '隨車老師點過之後這裡就會更新';

  return (
    <div>
      {flags.canMarkBusRide && (
        <Band
          kind="action"
          title="今天的點名"
          description="選路線與去回程，孩子上車、下車直接點"
          audience="staff"
        >
          <BusBoardingPanel />
        </Band>
      )}

      <Band kind="review" title={reviewTitle} description={reviewDescription}>
        <div className="flex flex-col gap-3">
          {isLoading && <SkeletonLines lines={1} />}
          {isError && <p className="text-sm text-red-700">無法載入學生清單。</p>}
          {students && students.length === 0 && (
            <p className="text-sm text-ink-soft">目前沒有可查看的學生。</p>
          )}
          <StudentSelect students={students} value={studentId} onChange={setStudentId} />
          {studentId && <BusTodayCard studentId={studentId} />}
        </div>
      </Band>

      {flags.canManageSchool && (
        <Band
          kind="manage"
          title="娃娃車設定"
          description="排路線、指派每個孩子在哪裡上下車"
          audience="staff"
        >
          <SurfaceLink href="/liff/admin/bus" className="btn-secondary block text-center text-sm">
            開啟娃娃車設定
          </SurfaceLink>
        </Band>
      )}
    </div>
  );
}
