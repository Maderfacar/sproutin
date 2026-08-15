'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMyStudents } from '../../../lib/queries';
import { LeaveForm } from '../../../features/leave/LeaveForm';
import { LeaveList } from '../../../features/leave/LeaveList';

// 家長請假頁：選學生（多小孩時）→ 申請 + 查看/取消該學生的請假紀錄。
// 老師/園長也可進入（後端已依 scope 過濾學生），審核端於後續子步驟（7c）加入。
export default function LeavePage() {
  const { data: students, isLoading, isError } = useMyStudents();
  const [studentId, setStudentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const first = students?.[0];
    if (first && !studentId) {
      setStudentId(first.id);
    }
  }, [students, studentId]);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/liff" className="text-sm text-brand-primary">
        ‹ 返回
      </Link>

      <h1 className="text-xl font-semibold text-gray-900">請假</h1>

      {isLoading && <p className="text-sm text-gray-500">載入學生中…</p>}
      {isError && <p className="text-sm text-red-600">無法載入學生清單。</p>}
      {students && students.length === 0 && (
        <p className="text-sm text-gray-500">目前沒有可申請請假的學生。</p>
      )}

      {students && students.length > 1 && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">選擇學生</span>
          <select
            value={studentId ?? ''}
            onChange={(e) => setStudentId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {studentId && (
        <>
          <LeaveForm studentId={studentId} />
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">請假紀錄</h2>
            <LeaveList studentId={studentId} />
          </section>
        </>
      )}
    </div>
  );
}
