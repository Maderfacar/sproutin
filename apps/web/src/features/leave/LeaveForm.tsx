'use client';

import { useState, type FormEvent } from 'react';
import { useCreateLeave } from './hooks';
import { leaveErrorMessage } from './labels';

// 'YYYY-MM-DD'（date input）→ 該日 UTC 午夜的 ISO datetime（後端 zod 要求 datetime 格式，
// 且事件投影以 UTC 逐日對齊 seed / Attendance @@unique([studentId,date])）。
function dateToIso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LeaveForm({ studentId }: { studentId: string }) {
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
        reason: reason.trim(),
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

  return (
    <form onSubmit={handleSubmit} className="rounded-card border border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-gray-900">申請請假</h2>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">開始日期</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">結束日期</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">事由</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="例如：發燒需在家休息"
            className="rounded-lg border border-gray-300 px-3 py-2"
            required
          />
        </label>

        {errorText && <p className="text-sm text-red-600">{errorText}</p>}
        {done && <p className="text-sm text-green-700">已送出請假申請。</p>}

        <button
          type="submit"
          disabled={createLeave.isPending}
          className="rounded-lg bg-brand-primary px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {createLeave.isPending ? '送出中…' : '送出申請'}
        </button>
      </div>
    </form>
  );
}
