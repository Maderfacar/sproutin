'use client';

import { apiErrorMessage } from '../../lib/api';
import { StatusScreen } from '../../components/StatusScreen';
import { SurfaceLink } from '../../components/SurfaceLink';
import { Icon } from '../../components/Icon';
import { STUDENT_STATUS_LABEL, useStudentDetail } from './adminHooks';
import { RELATION_LABEL } from '../people/hooks';
import { useAttendance } from '../attendance/hooks';
import { useLeaves } from '../leave/hooks';
import { ATTENDANCE_STATUS_LABEL } from '../attendance/labels';
import { LEAVE_STATUS_LABEL } from '../leave/labels';
import { StudentBusSection } from '../bus/StudentBusSection';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

// 學生整合視圖：把一個孩子散落在各頁的資訊收攏成一頁
//（基本資料 + 家長 + 本月出缺勤 + 娃娃車 + 最近請假），老師與園長不必在頁面之間跳來跳去。
// 授權完全沿用後端：老師只開得了自班學生、家長只開得了自己小孩。
//
// 桌面版 /admin/students/[id] 與手機版 /liff/student/[id] 共用這一份（docs/04 §3b）。
// 娃娃車設定要指派「這個孩子在哪裡上下車」時連的就是這一頁 —— 桌面版少了它，那條流程是斷的。
export function StudentDetail({ studentId }: { studentId: string }) {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: student, isLoading, isError, error } = useStudentDetail(studentId);
  const { data: attendance } = useAttendance(studentId);
  const { data: leaves } = useLeaves(studentId);

  if (isLoading) {
    return <StatusScreen status="loading" message="載入學生資料中…" />;
  }
  if (isError || !student) {
    return <StatusScreen status="error" message={apiErrorMessage(error)} />;
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
    <div className="space-y-7">
      <section className="rise-in flex items-center gap-4">
        <span
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ background: 'var(--brand-primary)' }}
          aria-hidden
        >
          {student.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl font-semibold text-ink">{student.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {student.className}
            {student.status !== 'ACTIVE' && ` · ${STUDENT_STATUS_LABEL[student.status]}`}
          </p>
        </div>
      </section>

      <section className="rise-in card p-5" style={{ animationDelay: '0.05s' }}>
        <p className="eyebrow">本月出缺勤</p>
        <div className="mt-3 flex border-t border-line pt-4">
          {[
            { value: present, label: '出席' },
            { value: leaveDays, label: '請假' },
            { value: absent, label: '缺席' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`flex-1 text-center ${i > 0 ? 'border-l border-line' : ''}`}
            >
              <p className="font-serif text-2xl font-semibold tabular-nums text-ink">{stat.value}</p>
              <p className="text-xs text-ink-soft">{stat.label}</p>
            </div>
          ))}
        </div>

        {recentAttendance.length > 0 && (
          <ul className="mt-4 border-t border-line pt-2">
            {recentAttendance.map((record) => (
              <li key={record.id} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="text-ink-soft">{formatDate(record.date)}</span>
                <span className="text-ink">{ATTENDANCE_STATUS_LABEL[record.status].label}</span>
                {record.source === 'LEAVE_EVENT' && (
                  <span className="ml-auto text-xs text-ink-soft">由請假產生</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rise-in" style={{ animationDelay: '0.1s' }}>
        <p className="eyebrow mb-2">家長 / 監護人</p>
        {student.guardians.length === 0 ? (
          <p className="border-t border-line py-4 text-sm text-ink-soft">
            尚未綁定家長 —— 這個孩子的家人目前收不到任何通知。
          </p>
        ) : (
          <ul className="border-t border-line">
            {student.guardians.map((g) => (
              <li key={g.userId} className="flex items-center gap-3 border-b border-line py-3">
                <Icon name="user" className="h-5 w-5 shrink-0 text-ink-soft" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{g.displayName}</span>
                <span className="shrink-0 text-xs text-ink-soft">
                  {RELATION_LABEL[g.relation]}
                  {g.isPrimary && ' · 主要聯絡人'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 娃娃車是學生的屬性（搭哪一班、在哪裡上下車），所以掛在這一頁而不另開一頁。
          只有園長／行政改得動；老師與家長不會看到這一段。 */}
      {flags.canManageSchool && (
        <section className="rise-in" style={{ animationDelay: '0.15s' }}>
          <p className="eyebrow mb-2">娃娃車</p>
          <StudentBusSection studentId={studentId} />
        </section>
      )}

      <section className="rise-in" style={{ animationDelay: '0.2s' }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow">最近請假</p>
          <SurfaceLink href="/liff/leave" className="text-xs font-bold text-brand-primary">
            全部
          </SurfaceLink>
        </div>
        {recentLeaves.length === 0 ? (
          <p className="border-t border-line py-4 text-sm text-ink-soft">目前沒有請假紀錄。</p>
        ) : (
          <ul className="border-t border-line">
            {recentLeaves.map((leave) => (
              <li key={leave.id} className="border-b border-line py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink">
                    {formatDate(leave.dateFrom)} – {formatDate(leave.dateTo)}
                  </span>
                  <span className={`chip ml-auto ${LEAVE_STATUS_LABEL[leave.status].className}`}>
                    {LEAVE_STATUS_LABEL[leave.status].label}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-ink-soft">{leave.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
