'use client';

import { useState, type FormEvent } from 'react';
import { ClassSelect } from '../../components/ClassSelect';
import { useSelectedClass } from '../classes/hooks';
import { useCreateAnnouncement } from './hooks';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { apiErrorMessage } from '../../lib/api';
import type { AnnouncementScope } from '../../lib/types';

// 發公告面板（Step 7c/7d）。老師 → 班級公告;園長/行政 → 可選全校或班級。
export function TeacherAnnouncePanel() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { classes, classId, setClassId, isLoading: classesLoading } = useSelectedClass();

  const [scope, setScope] = useState<AnnouncementScope>(flags.canAnnounceSchool ? 'SCHOOL' : 'CLASS');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [done, setDone] = useState(false);
  const create = useCreateAnnouncement();

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    setDone(false);
    if (!title.trim() || !body.trim()) return;
    if (scope === 'CLASS' && !classId) return;

    const payload =
      scope === 'SCHOOL'
        ? { scope: 'SCHOOL' as const, title: title.trim(), body: body.trim() }
        : { scope: 'CLASS' as const, classId, title: title.trim(), body: body.trim() };

    create.mutate(payload, {
      onSuccess: () => {
        setTitle('');
        setBody('');
        setDone(true);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-card border border-gray-200 bg-white p-4">
      <h2 className="font-semibold text-gray-900">發公告</h2>

      {flags.canAnnounceSchool && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">範圍</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as AnnouncementScope)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="SCHOOL">全校</option>
            <option value="CLASS">班級</option>
          </select>
        </label>
      )}

      {scope === 'CLASS' && (
        <>
          {classesLoading && <p className="text-sm text-gray-500">載入班級中…</p>}
          {classes && classes.length === 0 && (
            <p className="text-sm text-gray-500">你目前沒有任教班級。</p>
          )}
          <ClassSelect classes={classes} value={classId} onChange={setClassId} />
        </>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="公告標題"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={5000}
        placeholder="公告內容"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      {create.isError && <p className="text-sm text-red-600">{apiErrorMessage(create.error)}</p>}
      {done && <p className="text-sm text-green-700">公告已發布。</p>}

      <button
        type="submit"
        disabled={
          create.isPending || !title.trim() || !body.trim() || (scope === 'CLASS' && !classId)
        }
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {create.isPending ? '發布中…' : '發布公告'}
      </button>
    </form>
  );
}
