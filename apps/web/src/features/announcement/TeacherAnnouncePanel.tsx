'use client';

import { useState, type FormEvent } from 'react';
import { ClassSelect } from '../../components/ClassSelect';
import { useSelectedClass } from '../classes/hooks';
import { useCreateAnnouncement } from './hooks';
import { apiErrorMessage } from '../../lib/api';

// 老師端:發班級公告（scope=CLASS,綁自己任教班級）。
export function TeacherAnnouncePanel() {
  const { classes, classId, setClassId, isLoading: classesLoading } = useSelectedClass();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [done, setDone] = useState(false);
  const create = useCreateAnnouncement();

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    setDone(false);
    if (!classId || !title.trim() || !body.trim()) return;
    create.mutate(
      { scope: 'CLASS', classId, title: title.trim(), body: body.trim() },
      {
        onSuccess: () => {
          setTitle('');
          setBody('');
          setDone(true);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-card border border-gray-200 bg-white p-4">
      <h2 className="font-semibold text-gray-900">發班級公告（老師）</h2>

      {classesLoading && <p className="text-sm text-gray-500">載入班級中…</p>}
      {classes && classes.length === 0 && (
        <p className="text-sm text-gray-500">你目前沒有任教班級。</p>
      )}

      <ClassSelect classes={classes} value={classId} onChange={setClassId} />

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
        disabled={create.isPending || !classId || !title.trim() || !body.trim()}
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {create.isPending ? '發布中…' : '發布公告'}
      </button>
    </form>
  );
}
