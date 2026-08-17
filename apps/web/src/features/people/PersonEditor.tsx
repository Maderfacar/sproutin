'use client';

import { useState } from 'react';
import type { AdminStudentView, ClassView, GuardianRelation, UserView } from '../../lib/types';
import { apiErrorMessage } from '../../lib/api';
import { ROLE_LABEL } from '../../lib/roleLabels';
import { BindingSection } from './BindingSection';
import {
  RELATION_LABEL,
  peopleErrorMessage,
  useAddGuardianship,
  useAddTeacherAssignment,
  useRemoveGuardianship,
  useRemoveTeacherAssignment,
  useUpdatePerson,
} from './hooks';

interface PersonEditorProps {
  person: UserView;
  classes: ClassView[];
  students: AdminStudentView[];
  onClose: () => void;
}

const RELATIONS: GuardianRelation[] = ['MOTHER', 'FATHER', 'GRANDPARENT', 'GUARDIAN'];

// 單一人員的編輯面板：改名 / 啟用停用 / 關聯（家長綁小孩、老師帶班級）。
// 關聯即權限：綁定後這個人立刻看得到那個小孩或那個班，因此每個動作都寫稽核（後端）。
export function PersonEditor({ person, classes, students, onClose }: PersonEditorProps) {
  const [name, setName] = useState(person.displayName);
  const [studentId, setStudentId] = useState('');
  const [relation, setRelation] = useState<GuardianRelation>('MOTHER');
  const [classId, setClassId] = useState('');

  const updatePerson = useUpdatePerson();
  const addGuardianship = useAddGuardianship();
  const removeGuardianship = useRemoveGuardianship();
  const addAssignment = useAddTeacherAssignment();
  const removeAssignment = useRemoveTeacherAssignment();

  const error =
    updatePerson.error ??
    addGuardianship.error ??
    removeGuardianship.error ??
    addAssignment.error ??
    removeAssignment.error ??
    null;

  const roleNames = new Set(person.roles.map((r) => r.role));
  const isGuardianRole = roleNames.has('PARENT') || roleNames.has('GUARDIAN');
  const isTeacherRole = roleNames.has('TEACHER') || roleNames.has('BUS_TEACHER');
  const isActive = person.status === 'ACTIVE';

  const unboundStudents = students.filter(
    (s) => !person.guardianOf.some((g) => g.studentId === s.id),
  );
  const unassignedClasses = classes.filter((c) => !person.teaching.some((t) => t.classId === c.id));

  return (
    <section className="rise-in card space-y-5 p-5">
      <div className="flex items-center gap-2">
        <p className="section-title">編輯：{person.displayName}</p>
        <button type="button" onClick={onClose} className="btn-secondary ml-auto text-xs">
          關閉
        </button>
      </div>

      <label className="field-label">
        顯示名稱
        <span className="flex gap-2">
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            className="field"
          />
          <button
            type="button"
            disabled={updatePerson.isPending || name.trim() === person.displayName || !name.trim()}
            onClick={() => updatePerson.mutate({ id: person.id, patch: { displayName: name.trim() } })}
            className="btn-primary shrink-0 text-sm"
          >
            儲存
          </button>
        </span>
      </label>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{isActive ? '帳號啟用中' : '帳號已停用'}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            {isActive ? '停用後這個人就無法登入，但資料與歷史紀錄都會留著。' : '重新啟用後即可再次登入。'}
          </p>
        </div>
        <button
          type="button"
          disabled={updatePerson.isPending}
          onClick={() =>
            updatePerson.mutate({
              id: person.id,
              patch: { status: isActive ? 'INACTIVE' : 'ACTIVE' },
            })
          }
          className="btn-secondary ml-auto shrink-0 text-xs"
        >
          {isActive ? '停用帳號' : '重新啟用'}
        </button>
      </div>

      {isGuardianRole && (
        <div className="border-t border-line pt-4">
          <p className="eyebrow">負責的小孩</p>
          {person.guardianOf.length === 0 ? (
            <p className="mt-2 text-xs text-ink-soft">還沒綁定任何小孩 —— 這位家長目前看不到任何資料。</p>
          ) : (
            <ul className="mt-2">
              {person.guardianOf.map((g) => (
                <li key={g.id} className="flex items-center gap-3 border-b border-line py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {g.studentName}
                    <span className="ml-2 text-xs text-ink-soft">{RELATION_LABEL[g.relation]}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`解除與 ${g.studentName} 的綁定`}
                    disabled={removeGuardianship.isPending}
                    onClick={() => removeGuardianship.mutate({ id: g.id })}
                    className="btn-secondary shrink-0 text-xs"
                  >
                    解除
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex gap-2">
            <select
              aria-label="選擇小孩"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="field text-sm"
            >
              <option value="">選擇小孩…</option>
              {unboundStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              aria-label="關係"
              value={relation}
              onChange={(e) => setRelation(e.target.value as GuardianRelation)}
              className="field w-24 shrink-0 text-sm"
            >
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {RELATION_LABEL[r]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!studentId || addGuardianship.isPending}
              onClick={() =>
                addGuardianship.mutate(
                  { userId: person.id, studentId, relation },
                  { onSuccess: () => setStudentId('') },
                )
              }
              className="btn-primary shrink-0 text-sm"
            >
              綁定
            </button>
          </div>
        </div>
      )}

      {isTeacherRole && (
        <div className="border-t border-line pt-4">
          <p className="eyebrow">任教班級</p>
          {person.teaching.length === 0 ? (
            <p className="mt-2 text-xs text-ink-soft">還沒排班 —— 這位老師目前看不到任何學生。</p>
          ) : (
            <ul className="mt-2">
              {person.teaching.map((t) => (
                <li key={t.id} className="flex items-center gap-3 border-b border-line py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.className}</span>
                  <button
                    type="button"
                    aria-label={`解除 ${t.className} 的編制`}
                    disabled={removeAssignment.isPending}
                    onClick={() => removeAssignment.mutate({ id: t.id })}
                    className="btn-secondary shrink-0 text-xs"
                  >
                    解除
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex gap-2">
            <select
              aria-label="選擇班級"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="field text-sm"
            >
              <option value="">選擇班級…</option>
              {unassignedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!classId || addAssignment.isPending}
              onClick={() =>
                addAssignment.mutate(
                  { userId: person.id, classId },
                  { onSuccess: () => setClassId('') },
                )
              }
              className="btn-primary shrink-0 text-sm"
            >
              排入
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-line pt-4">
        <p className="eyebrow">身分</p>
        <p className="mt-1 text-sm text-ink">
          {person.roles.map((r) => ROLE_LABEL[r.role] ?? r.role).join(' · ') || '未指定'}
        </p>
      </div>

      <BindingSection person={person} />

      {error && (
        <p className="text-sm text-red-700">{peopleErrorMessage(error, apiErrorMessage(error))}</p>
      )}
    </section>
  );
}
