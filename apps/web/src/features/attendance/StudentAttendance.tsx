'use client';

import { useSelectedStudent } from '../students/useSelectedStudent';
import { useAttendance } from './hooks';
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_TONE } from './labels';
import { apiErrorMessage } from '../../lib/api';
import type { AttendanceView } from '../../lib/types';
import {
  Badge,
  EmptyState,
  ErrorNotice,
  SectionHead,
  Segmented,
  SkeletonRows,
} from '../../components/ui';
import { schoolToday } from '../../lib/datetime';

// 單一學生的出缺勤紀錄：這個月的三個數字 + 每一天一列。
//
// **首頁只講今天，這一頁才講整體。** 本月統計原本擠在家長首頁上，
// 和「今天到了沒」搶同一個位置 —— 統計是「回頭看」不是「今天」，
// 搬到這裡之後首頁只剩一個主角，這一頁也終於有存在的理由。
//
// 學生名單來自 useSelectedStudent，**範圍已經依身分切好**：
// 家長只有自己的小孩，校方是可見範圍內的學生。所以這一份同時服務兩邊，不必做兩套。

function byDateDesc(a: AttendanceView, b: AttendanceView): number {
  return b.date.localeCompare(a.date);
}

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'] as const;

function weekday(dateIso: string): string {
  return WEEKDAY[new Date(dateIso).getUTCDay()] ?? '';
}

export function StudentAttendance() {
  const { students, studentId, setStudentId, isLoading: studentsLoading } = useSelectedStudent();
  const { data, isLoading, isError, error, refetch } = useAttendance(studentId);

  if (!studentsLoading && students && students.length === 0) {
    return (
      <EmptyState
        title="還沒有連結到孩子的資料"
        hint="請跟園所確認你的 LINE 帳號是不是已經綁定好了"
      />
    );
  }

  const monthKey = schoolToday().slice(0, 7);
  const monthRows = (data ?? []).filter((a) => a.date.slice(0, 7) === monthKey);
  const present = monthRows.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const leave = monthRows.filter((a) => a.status === 'LEAVE').length;
  const absent = monthRows.filter((a) => a.status === 'ABSENT').length;

  return (
    <div className="flex flex-col gap-6">
      {students && students.length > 1 && (
        <Segmented
          label="選擇孩子"
          options={students.map((s) => ({ value: s.id, label: s.name }))}
          value={studentId}
          onChange={setStudentId}
        />
      )}

      {isError && <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />}

      {monthRows.length > 0 && (
        <section>
          <SectionHead title="這個月" description="從這個月 1 號算到今天" weight="review" />
          <div className="grid grid-cols-3 gap-2">
            <Stat label="有來上學" value={present} tone="good" />
            <Stat label="請假" value={leave} tone="wait" />
            <Stat label="沒到校" value={absent} tone={absent > 0 ? 'stop' : 'neutral'} />
          </div>
        </section>
      )}

      <section>
        <SectionHead title="每一天" description="老師點完名這裡就會更新" weight="review" />

        {isLoading && <SkeletonRows rows={5} />}
        {data && data.length === 0 && (
          <EmptyState title="還沒有出缺勤紀錄" hint="老師開始點名後會出現在這裡" />
        )}

        {data && data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {[...data].sort(byDateDesc).map((row) => (
              <li
                key={row.id}
                className="flex min-h-touch items-center gap-3 rounded-card border border-line bg-surface px-4 py-3"
              >
                <span className="font-serif text-base font-bold tabular-nums text-ink">
                  {row.date.slice(0, 10)}
                </span>
                <span className="text-2xs text-ink-mute">週{weekday(row.date)}</span>
                <span className="ml-auto">
                  <Badge tone={ATTENDANCE_STATUS_TONE[row.status]}>
                    {ATTENDANCE_STATUS_LABEL[row.status].label}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'good' | 'wait' | 'stop' | 'neutral' }) {
  const skin =
    tone === 'good'
      ? 'bg-good-wash text-good-text'
      : tone === 'wait'
        ? 'bg-wait-wash text-wait-text'
        : tone === 'stop'
          ? 'bg-stop-wash text-stop-text'
          : 'bg-surface-sunk text-ink-soft';
  return (
    <div className={`rounded-card px-3 py-3 ${skin}`}>
      <p className="text-2xs font-semibold opacity-80">{label}</p>
      <p className="mt-0.5 font-serif text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
