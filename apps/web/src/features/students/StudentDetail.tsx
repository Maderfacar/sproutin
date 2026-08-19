'use client';

import { apiErrorMessage } from '../../lib/api';
import { SurfaceLink } from '../../components/SurfaceLink';
import { Icon } from '../../components/Icon';
import { STUDENT_STATUS_LABEL, useStudentDetail } from './adminHooks';
import { RELATION_LABEL } from '../people/hooks';
import { useAttendance } from '../attendance/hooks';
import { useLeaves } from '../leave/hooks';
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_TONE } from '../attendance/labels';
import { LEAVE_STATUS_LABEL, LEAVE_STATUS_TONE } from '../leave/labels';
import { StudentBusSection } from '../bus/StudentBusSection';
import { useCapabilities } from '../../lib/useCapabilities';
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorNotice,
  Row,
  SectionHead,
  SkeletonCards,
} from '../../components/ui';
import { formatMonthDay, schoolMonth } from '../../lib/datetime';

function monthKey(): string {
  return schoolMonth();
}

// 學生整合視圖：把一個孩子散落在各頁的資訊收攏成一頁
//（基本資料 + 本月出缺勤 + 家長 + 娃娃車 + 最近請假），老師與園長不必在頁面之間跳來跳去。
// 授權完全沿用後端：老師只開得了自班學生、家長只開得了自己小孩。
//
// 桌面版 /admin/students/[id] 與手機版 /liff/student/[id] 共用這一份（docs/04 §3b）。
// 娃娃車設定要指派「這個孩子在哪裡上下車」時連的就是這一頁 —— 桌面版少了它，那條流程是斷的。
//
// 清葉加厚（2026-08-20）：改用 SectionHead 斷句，粗線＝這一段動得了東西（娃娃車），
// 細線＝只是翻閱。最上面那一塊是「這是誰的頁面」，所以不算一段，也不給標題 ——
// 它就是頁面本身。
export function StudentDetail({ studentId }: { studentId: string }) {
  // 依身分而不是角色聯集：園長兼家長切到家長身分時，不該在孩子的頁面上看到娃娃車設定。
  const flags = useCapabilities();
  const { data: student, isLoading, isError, error, refetch } = useStudentDetail(studentId);
  const { data: attendance } = useAttendance(studentId);
  const { data: leaves } = useLeaves(studentId);

  if (isLoading) {
    return <SkeletonCards cards={3} />;
  }
  if (isError || !student) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const thisMonth = (attendance ?? []).filter((a) => a.date.slice(0, 7) === monthKey());
  const present = thisMonth.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const leaveDays = thisMonth.filter((a) => a.status === 'LEAVE').length;
  const absent = thisMonth.filter((a) => a.status === 'ABSENT').length;
  const recentAttendance = [...(attendance ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const recentLeaves = [...(leaves ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-7">
      {/* 這一塊是「這是誰的頁面」，不是一個區塊 —— 所以沒有標題也沒有線。 */}
      <section className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-primary font-serif text-2xl font-bold text-brand-contrast shadow-soft"
        >
          {student.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl font-bold tracking-tight text-ink">
            {student.name}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
            {student.className}
            {student.status !== 'ACTIVE' && (
              <Badge tone="neutral">{STUDENT_STATUS_LABEL[student.status]}</Badge>
            )}
          </p>
        </div>
      </section>

      <section>
        <SectionHead
          title="本月出缺勤"
          description="這個月的天數統計，以及最近五筆紀錄"
          weight="review"
        />
        <div className="grid grid-cols-3 gap-2">
          <Stat label="出席" value={present} skin="bg-good-wash text-good-text" />
          <Stat label="請假" value={leaveDays} skin="bg-wait-wash text-wait-text" />
          <Stat
            label="缺席"
            value={absent}
            skin={absent > 0 ? 'bg-stop-wash text-stop-text' : 'bg-surface-sunk text-ink-soft'}
          />
        </div>

        {recentAttendance.length === 0 ? (
          <p className="mt-3 text-2xs text-ink-mute">這個月還沒有出缺勤紀錄。</p>
        ) : (
          <ul className="mt-3">
            {recentAttendance.map((record) => (
              <li key={record.id}>
                <Row
                  title={
                    <span className="tabular-nums text-ink-soft">
                      {formatMonthDay(record.date)}
                    </span>
                  }
                  detail={record.source === 'LEAVE_EVENT' ? '由請假自動產生' : undefined}
                  trailing={
                    <Badge tone={ATTENDANCE_STATUS_TONE[record.status]}>
                      {ATTENDANCE_STATUS_LABEL[record.status].label}
                    </Badge>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHead
          title="家長 / 監護人"
          description="這個孩子的通知會送給這些人"
          weight="review"
        />
        {student.guardians.length === 0 ? (
          <EmptyState
            title="還沒有綁定家長"
            hint="這個孩子的家人目前收不到任何通知，請到「人員與綁定」發一組綁定碼給他們"
          />
        ) : (
          <ul>
            {student.guardians.map((g) => (
              <li key={g.userId}>
                <Row
                  lead={<Avatar name={g.displayName} />}
                  title={g.displayName}
                  detail={RELATION_LABEL[g.relation]}
                  trailing={g.isPrimary ? <Badge tone="brand">主要聯絡人</Badge> : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 娃娃車是學生的屬性（搭哪一班、在哪裡上下車），所以掛在這一頁而不另開一頁。
          這是整頁唯一改得動東西的一段，用粗線收住；只有園長／行政看得到。 */}
      {flags.canManageSchool && (
        <section>
          <SectionHead title="娃娃車" description="這個孩子搭哪一條路線、在哪裡上下車" />
          <StudentBusSection studentId={studentId} />
        </section>
      )}

      <section>
        <SectionHead title="最近請假" description="最新的三筆" weight="review" />
        {recentLeaves.length === 0 ? (
          <EmptyState title="還沒有請過假" />
        ) : (
          <ul className="flex flex-col gap-3">
            {recentLeaves.map((leave) => (
              <li key={leave.id} className="rounded-card border border-line bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-base font-bold tabular-nums text-ink">
                    {formatMonthDay(leave.dateFrom)} – {formatMonthDay(leave.dateTo)}
                  </span>
                  <span className="ml-auto">
                    <Badge tone={LEAVE_STATUS_TONE[leave.status]}>
                      {LEAVE_STATUS_LABEL[leave.status].label}
                    </Badge>
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink-soft">{leave.reason}</p>
              </li>
            ))}
          </ul>
        )}
        {/* 連結不包按鈕：兩個可聚焦的東西疊在一起，鍵盤要按兩次才過得去。 */}
        <SurfaceLink
          href="/liff/leave"
          className="tappable mt-3 inline-flex min-h-touch items-center gap-1.5 font-semibold text-brand-primary"
        >
          看全部請假紀錄
          <Icon name="chev" className="h-4 w-4" />
        </SurfaceLink>
      </section>
    </div>
  );
}

function Stat({ label, value, skin }: { label: string; value: number; skin: string }) {
  return (
    <div className={`rounded-card px-3 py-3 ${skin}`}>
      <p className="text-2xs font-semibold opacity-80">{label}</p>
      <p className="mt-0.5 font-serif text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
