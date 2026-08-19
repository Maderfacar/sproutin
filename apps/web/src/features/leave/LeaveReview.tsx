'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { useSelectedClass } from '../classes/hooks';
import { useMyStudents } from '../../lib/queries';
import { useClassPendingLeaves, useSchoolPendingLeaves, useSetLeaveStatus } from './hooks';
import { leaveErrorMessage } from './labels';
import { LeaveRequestSheet } from './LeaveRequestSheet';
import type { LeaveView } from '../../lib/types';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  Segmented,
  Sheet,
  SkeletonRows,
} from '../../components/ui';

// 請假審核。**一頁只有等你決定的事。**
//
// 舊版把「待審核」和「我要幫孩子請假」疊在同一頁（因為老師也可能是家長）——
// 現在身分是分開的殼，校方這一邊就只剩審核。做完整頁會空掉，那正是它該有的樣子。
//
// 一份元件兩種範圍（scope）：導師看自己班、園長／行政看全校。
// 差別只有「資料從哪裡來」與「要不要挑班級」，其餘完全一樣 ——
// 兩種範圍各做一套介面，遲早會有一邊的改動漏掉。
//
// 駁回一定要寫理由：家長收到「已駁回」卻不知道為什麼，只會再打電話問一次老師，
// 兩邊都沒省到事。核准則不強迫寫，因為核准本身就是完整的答案。

function range(leave: LeaveView): string {
  const from = leave.dateFrom.slice(0, 10);
  const to = leave.dateTo.slice(0, 10);
  return from === to ? from : `${from} ～ ${to}`;
}

export function LeaveReview({ scope }: { scope: 'class' | 'school' }) {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const isSchool = scope === 'school';

  const { classes, classId, setClassId, isLoading: classesLoading } = useSelectedClass();
  const { data: students } = useMyStudents();

  // 兩支查詢都要無條件呼叫（Rules of Hooks），用 enabled 決定誰真的去抓。
  const classQuery = useClassPendingLeaves(isSchool ? undefined : classId);
  const schoolQuery = useSchoolPendingLeaves(isSchool);
  const { data: pending, isLoading, isError, error, refetch } = isSchool ? schoolQuery : classQuery;

  const setStatus = useSetLeaveStatus();

  // 要駁回的那一筆。開著就是駁回面板打開的意思。
  const [rejecting, setRejecting] = useState<LeaveView | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  const nameOf = (studentId: string): string =>
    students?.find((s) => s.id === studentId)?.name ?? '這位小朋友';

  function confirmReject(): void {
    if (!rejecting) return;
    if (!note.trim()) {
      setNoteError('請寫一句原因，家長才知道要怎麼辦。');
      return;
    }
    setStatus.mutate(
      { leaveId: rejecting.id, body: { status: 'REJECTED', reviewNote: note.trim() } },
      {
        onSuccess: () => {
          setRejecting(null);
          setNote('');
          setNoteError(null);
        },
      },
    );
  }

  if (!isSchool && classesLoading) {
    return <SkeletonRows rows={3} />;
  }
  if (!isSchool && classes && classes.length === 0) {
    return <EmptyState title="你目前沒有帶班級" hint="請園所指派班級後再回來" />;
  }

  return (
    <div className="flex flex-col gap-5">
      {!isSchool && classes && classes.length > 1 && classes.length <= 3 && (
        <Segmented
          label="選擇班級"
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={setClassId}
        />
      )}

      {/* 家長打電話來請假是實際會發生的事（docs/05 矩陣 canApplyLeave 本來就含 TEACHER/ADMIN）。
          這個入口做成次要按鈕：校方進這一頁九成是來審核的，代填是例外。 */}
      {flags.canApplyLeave && (students?.length ?? 0) > 0 && (
        <Button variant="secondary" onClick={() => setApplyOpen(true)}>
          代家長請假
        </Button>
      )}

      {isLoading && <SkeletonRows rows={3} />}
      {isError && <ErrorNotice message={leaveErrorMessage(error)} onRetry={() => void refetch()} />}
      {setStatus.isError && <ErrorNotice message={leaveErrorMessage(setStatus.error)} />}

      {pending && pending.length === 0 && (
        <EmptyState
          title={isSchool ? '全校都沒有等審核的請假' : '沒有等你審核的請假'}
          hint="家長送出後會出現在這裡"
        />
      )}

      {pending && pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map((leave) => (
            <li key={leave.id} className="rounded-tile border border-line-strong bg-surface p-4">
              <div className="flex items-center gap-3">
                <Avatar name={nameOf(leave.studentId)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-ink">{nameOf(leave.studentId)}</p>
                  <p className="text-2xs tabular-nums text-ink-soft">{range(leave)}</p>
                </div>
                <Badge tone="wait">等你決定</Badge>
              </div>

              <p className="mt-3 rounded-md2 bg-surface-sunk px-3 py-2.5 text-sm leading-relaxed text-ink">
                {leave.reason}
              </p>

              {flags.canReviewLeave ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="primary"
                    disabled={setStatus.isPending}
                    onClick={() =>
                      setStatus.mutate({ leaveId: leave.id, body: { status: 'APPROVED' } })
                    }
                  >
                    准假
                  </Button>
                  <Button
                    variant="danger"
                    block={false}
                    disabled={setStatus.isPending}
                    onClick={() => {
                      setRejecting(leave);
                      setNote('');
                      setNoteError(null);
                    }}
                  >
                    不准
                  </Button>
                </div>
              ) : (
                // 園長只有 OWNER 身分時看得到但改不動（docs/05 矩陣）——
                // 講清楚是誰能處理，比放一顆按了會 403 的按鈕好。
                <p className="mt-3 text-2xs text-ink-soft">
                  這筆由導師或行政人員審核，你在這裡看得到結果。
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {students && students.length > 0 && (
        <LeaveRequestSheet
          open={applyOpen}
          students={students}
          title="代家長請假"
          onClose={() => setApplyOpen(false)}
        />
      )}

      {/* 駁回一定要寫理由 —— 家長收到「已駁回」卻不知道為什麼，只會再打電話問一次。 */}
      <Sheet
        open={rejecting !== null}
        title={rejecting ? `不准 ${nameOf(rejecting.studentId)} 的請假` : '不准這筆請假'}
        onClose={() => setRejecting(null)}
      >
        <div className="flex flex-col gap-4">
          <Field label="為什麼" hint="這句話家長會直接看到" error={noteError ?? undefined}>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError(null);
              }}
              rows={3}
              maxLength={500}
              placeholder="例如：這天有期末成果發表，請再確認一次"
              className="field resize-none"
            />
          </Field>
          <Button variant="danger" disabled={setStatus.isPending} onClick={confirmReject}>
            {setStatus.isPending ? '送出中…' : '確定不准，並通知家長'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
