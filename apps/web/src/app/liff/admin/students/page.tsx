'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';
import { apiErrorMessage } from '../../../../lib/api';
import type { AdminStudentView, StudentStatus } from '../../../../lib/types';
import { PageHeader } from '../../../../components/PageHeader';
import { StatusScreen } from '../../../../components/StatusScreen';
import { Icon } from '../../../../components/Icon';
import { useMyClasses } from '../../../../features/classes/hooks';
import {
  STUDENT_STATUS_LABEL,
  useAdminStudents,
  useCreateStudent,
  useUpdateStudent,
} from '../../../../features/students/adminHooks';

const STATUS_OPTIONS: StudentStatus[] = ['ACTIVE', 'INACTIVE', 'GRADUATED'];

// 學生管理（OWNER/ADMIN）：新增、改名、換班、改在學狀態。
// 「只停用不刪除」：畢業/離校改狀態，資料留著（出缺勤、請假、訊息等歷史需要它）。
export default function StudentsAdminPage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: classes } = useMyClasses();
  const [filterClassId, setFilterClassId] = useState<string>('');
  const { data: students, isLoading, isError, error } = useAdminStudents(filterClassId || undefined);
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const [newName, setNewName] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [editing, setEditing] = useState<AdminStudentView | null>(null);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以管理學生。" />;
  }
  if (isLoading) {
    return <StatusScreen status="loading" message="載入學生名單中…" />;
  }
  if (isError || !students) {
    return <StatusScreen status="error" message={apiErrorMessage(error)} />;
  }

  const className = (id: string): string => classes?.find((c) => c.id === id)?.name ?? '未分班';
  const busy = createStudent.isPending || updateStudent.isPending;
  const actionError = createStudent.error ?? updateStudent.error ?? null;
  const hasClasses = (classes?.length ?? 0) > 0;

  const submitNew = (): void => {
    const name = newName.trim();
    const classId = newClassId || classes?.[0]?.id;
    if (!name || !classId) return;
    createStudent.mutate({ name, classId }, { onSuccess: () => setNewName('') });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="學生管理" />

      {!hasClasses ? (
        <section className="rise-in card p-5">
          <p className="text-sm leading-relaxed text-ink">
            還沒有任何班級，學生必須先有班可以進。
          </p>
          <Link href="/liff/admin/classes" className="btn-primary mt-4 inline-block text-sm">
            先去建立班級
          </Link>
        </section>
      ) : (
        <section className="rise-in card p-5">
          <p className="eyebrow">新增學生</p>
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={newName}
              maxLength={40}
              placeholder="學生姓名"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNew()}
              className="field"
            />
            <div className="flex gap-2">
              <select
                aria-label="班級"
                value={newClassId || classes?.[0]?.id || ''}
                onChange={(e) => setNewClassId(e.target.value)}
                className="field"
              >
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={submitNew}
                disabled={busy || newName.trim().length === 0}
                className="btn-primary shrink-0 text-sm"
              >
                新增
              </button>
            </div>
          </div>
        </section>
      )}

      {actionError && <p className="text-sm text-red-700">{apiErrorMessage(actionError)}</p>}

      <section className="rise-in" style={{ animationDelay: '0.05s' }}>
        <div className="mb-2 flex items-center gap-3">
          <p className="eyebrow">學生（{students.length}）</p>
          <select
            aria-label="依班級篩選"
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="ml-auto bg-transparent text-xs font-bold text-ink outline-none"
          >
            <option value="">全部班級</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {students.length === 0 ? (
          <p className="border-t border-line py-6 text-center text-sm text-ink-soft">
            這個範圍還沒有學生。
          </p>
        ) : (
          <ul className="border-t border-line">
            {students.map((student) => (
              <li key={student.id} className="flex items-center gap-3 border-b border-line py-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: 'var(--brand-primary)' }}
                  aria-hidden
                >
                  {student.name.charAt(0)}
                </span>
                <Link href={`/liff/student/${student.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{student.name}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {className(student.classId)}
                    {student.status !== 'ACTIVE' && ` · ${STUDENT_STATUS_LABEL[student.status]}`}
                  </p>
                </Link>
                <button
                  type="button"
                  aria-label={`編輯 ${student.name}`}
                  onClick={() => setEditing(student)}
                  className="btn-secondary shrink-0 text-xs"
                >
                  編輯
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <section className="rise-in card space-y-4 p-5">
          <p className="section-title">編輯：{editing.name}</p>

          <label className="field-label">
            姓名
            <input
              type="text"
              value={editing.name}
              maxLength={40}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="field"
            />
          </label>

          <label className="field-label">
            班級
            <select
              value={editing.classId}
              onChange={(e) => setEditing({ ...editing, classId: e.target.value })}
              className="field"
            >
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            在學狀態
            <select
              value={editing.status}
              onChange={(e) => setEditing({ ...editing, status: e.target.value as StudentStatus })}
              className="field"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STUDENT_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                updateStudent.mutate(
                  {
                    id: editing.id,
                    patch: {
                      name: editing.name.trim(),
                      classId: editing.classId,
                      status: editing.status,
                    },
                  },
                  { onSuccess: () => setEditing(null) },
                )
              }
              disabled={busy || editing.name.trim().length === 0}
              className="btn-primary flex-1 text-sm"
            >
              {updateStudent.isPending ? '儲存中…' : '儲存'}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary text-sm">
              取消
            </button>
          </div>
        </section>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        學生不會被刪除。畢業或離校請改「在學狀態」，出缺勤與請假等歷史紀錄才不會斷掉。
      </p>
    </div>
  );
}
