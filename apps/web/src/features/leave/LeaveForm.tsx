'use client';

import { useState, type FormEvent } from 'react';
import { useCreateLeave } from './hooks';
import { leaveErrorMessage } from './labels';
import { Icon } from '../../components/Icon';

// 'YYYY-MM-DD'（date input）→ 該日 UTC 午夜的 ISO datetime（後端 zod 要求 datetime 格式，
// 且事件投影以 UTC 逐日對齊 seed / Attendance @@unique([studentId,date])）。
function dateToIso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORIES = ['病假', '事假', '其他'] as const;

export function LeaveForm({ studentId }: { studentId: string }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('病假');
  const [dateFrom, setDateFrom] = useState(todayInput);
  const [dateTo, setDateTo] = useState(todayInput);
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const createLeave = useCreateLeave();

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    setLocalError(null);
    setDone(false);

    if (!reason.trim()) {
      setLocalError('請填寫請假事由。');
      return;
    }
    if (dateTo < dateFrom) {
      setLocalError('結束日期不可早於開始日期。');
      return;
    }

    createLeave.mutate(
      {
        studentId,
        dateFrom: dateToIso(dateFrom),
        dateTo: dateToIso(dateTo),
        reason: `${category}：${reason.trim()}`,
      },
      {
        onSuccess: () => {
          setReason('');
          setDone(true);
        },
      },
    );
  }

  const errorText = localError ?? (createLeave.isError ? leaveErrorMessage(createLeave.error) : null);
  const underline =
    'flex items-center gap-2 border-b-[1.5px] border-line pb-2 transition focus-within:border-brand-primary';

  return (
    <form onSubmit={handleSubmit} className="card space-y-6 p-5">
      {/* 請假類別 */}
      <div>
        <p className="eyebrow mb-3">請假類別</p>
        <div className="flex gap-2.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === c
                  ? 'bg-brand-primary text-white'
                  : 'border border-line text-ink-soft hover:border-brand-primary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 請假日期 */}
      <div>
        <p className="eyebrow mb-3">請假日期</p>
        <div className="flex gap-4">
          <label className={`${underline} flex-1`}>
            <Icon name="cal" className="h-4 w-4 shrink-0 text-brand-primary" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-transparent text-ink outline-none tabular-nums"
              required
            />
          </label>
          <label className={`${underline} flex-1`}>
            <Icon name="cal" className="h-4 w-4 shrink-0 text-brand-primary" />
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-transparent text-ink outline-none tabular-nums"
              required
            />
          </label>
        </div>
      </div>

      {/* 事由說明 */}
      <div>
        <p className="eyebrow mb-3">事由說明</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="例如：發燒需在家休息"
          className="w-full resize-none border-b-[1.5px] border-line bg-transparent pb-2 text-ink outline-none transition placeholder:text-ink-soft focus:border-brand-primary"
          required
        />
      </div>

      {errorText && <p className="text-sm font-medium text-red-600">{errorText}</p>}
      {done && <p className="text-sm font-medium text-brand-primary">已送出請假申請 🎉</p>}

      <div>
        <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-soft">
          <Icon name="check" className="h-3.5 w-3.5" />
          送出後將通知老師審核
        </p>
        <button type="submit" disabled={createLeave.isPending} className="btn-primary w-full">
          {createLeave.isPending ? '送出中…' : '送出申請'}
        </button>
      </div>
    </form>
  );
}
