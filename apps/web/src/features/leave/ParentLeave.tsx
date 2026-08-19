'use client';

import { useState } from 'react';
import { useSelectedStudent } from '../students/useSelectedStudent';
import { useLeaves, useCancelLeave, isOptimisticLeave } from './hooks';
import { CANCELLABLE_STATUSES, LEAVE_STATUS_LABEL, LEAVE_STATUS_TONE, leaveErrorMessage } from './labels';
import { LeaveRequestSheet } from './LeaveRequestSheet';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  SectionHead,
  Segmented,
  SkeletonRows,
} from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { LeaveView } from '../../lib/types';

// 家長的請假頁。**一顆按鈕 + 一份紀錄**，沒有第三樣東西。
//
// 舊版把「申請表單」直接長在頁面中段，家長一進來看到的是一堆欄位；
// 但家長多數時候進這一頁是來**查上次那筆准了沒**，真正要申請時才需要表單。
// 所以順序反過來：結果在上、表單收進底部面板。

function formatRange(leave: LeaveView): string {
  const from = leave.dateFrom.slice(0, 10);
  const to = leave.dateTo.slice(0, 10);
  return from === to ? from : `${from} ～ ${to}`;
}

export function ParentLeave() {
  const { students, studentId, setStudentId, isLoading: studentsLoading } = useSelectedStudent();
  const [sheetOpen, setSheetOpen] = useState(false);

  const student = students?.find((s) => s.id === studentId);
  const { data: leaves, isLoading, isError, error, refetch } = useLeaves(studentId);
  const cancelLeave = useCancelLeave();

  if (!studentsLoading && students && students.length === 0) {
    return (
      <EmptyState
        title="還沒有連結到孩子的資料"
        hint="請跟園所確認你的 LINE 帳號是不是已經綁定好了"
      />
    );
  }

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

      {/* 這一頁唯一的主要按鈕。 */}
      <Button variant="primary" onClick={() => setSheetOpen(true)} disabled={!studentId}>
        <Icon name="doc" className="h-5 w-5" />
        {student ? `幫 ${student.name} 請假` : '幫孩子請假'}
      </Button>

      {studentId && student && (
        <LeaveRequestSheet
          open={sheetOpen}
          studentId={studentId}
          studentName={student.name}
          onClose={() => setSheetOpen(false)}
        />
      )}

      <section>
        <SectionHead
          title="請假紀錄"
          description="送出後在這裡看結果：等老師看、已核准、或被駁回"
          weight="review"
        />

        {isLoading && <SkeletonRows rows={3} />}
        {isError && <ErrorNotice message={leaveErrorMessage(error)} onRetry={() => void refetch()} />}

        {leaves && leaves.length === 0 && (
          <EmptyState title="還沒有請過假" hint="需要時按上面那顆按鈕就可以了" />
        )}

        {leaves && leaves.length > 0 && (
          <ul className="flex flex-col gap-3">
            {leaves.map((leave) => {
              // 剛按下送出、伺服器還沒回來的那一列：不宣稱狀態（我們還不知道），也不能取消。
              const sending = isOptimisticLeave(leave);
              const canCancel = !sending && CANCELLABLE_STATUSES.includes(leave.status);
              return (
                <li
                  key={leave.id}
                  className={`rounded-card border border-line bg-surface p-4 ${sending ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base font-bold tabular-nums text-ink">
                      {formatRange(leave)}
                    </span>
                    <span className="ml-auto">
                      {sending ? (
                        <Badge tone="neutral">送出中…</Badge>
                      ) : (
                        <Badge tone={LEAVE_STATUS_TONE[leave.status]}>
                          {LEAVE_STATUS_LABEL[leave.status].label}
                        </Badge>
                      )}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">{leave.reason}</p>
                  {leave.reviewNote && (
                    <p className="mt-1 text-sm text-ink-soft">老師的話：{leave.reviewNote}</p>
                  )}
                  {canCancel && (
                    <div className="mt-3">
                      <Button
                        variant="secondary"
                        onClick={() => cancelLeave.mutate(leave.id)}
                        disabled={cancelLeave.isPending}
                      >
                        取消這筆請假
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {cancelLeave.isError && (
          <div className="mt-3">
            <ErrorNotice message={leaveErrorMessage(cancelLeave.error)} />
          </div>
        )}
      </section>
    </div>
  );
}
