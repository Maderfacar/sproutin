'use client';

import { useState, type FormEvent } from 'react';
import { useSelectedClass } from '../classes/hooks';
import { useCreateAnnouncement } from './hooks';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { apiErrorMessage } from '../../lib/api';
import type { AnnouncementScope } from '../../lib/types';
import { Button, Field, Segmented, Sheet } from '../../components/ui';

// 發一則公告。從底部滑上來 —— 公告頁多數時候是來看有沒有新的，發布是例外。
//
// 老師只能發給自己帶的班（班級清單已依身分縮小，見 useVisibleClasses）；
// 園長／行政可以選全校或某一個班。
export function AnnounceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { classes, classId, setClassId } = useSelectedClass();

  const [scope, setScope] = useState<AnnouncementScope>(
    flags.canAnnounceSchool ? 'SCHOOL' : 'CLASS',
  );
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const create = useCreateAnnouncement();

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    setLocalError(null);

    if (!title.trim()) {
      setLocalError('請寫一個標題，家長在列表上先看到的就是它。');
      return;
    }
    if (!body.trim()) {
      setLocalError('請寫內容。');
      return;
    }
    if (scope === 'CLASS' && !classId) {
      setLocalError('請選一個班級。');
      return;
    }

    const payload =
      scope === 'SCHOOL'
        ? { scope: 'SCHOOL' as const, title: title.trim(), body: body.trim() }
        : { scope: 'CLASS' as const, classId, title: title.trim(), body: body.trim() };

    create.mutate(payload, {
      // 發完就關掉 —— 新的那一則已經在下面的列表最上面了。
      onSuccess: () => {
        setTitle('');
        setBody('');
        setLocalError(null);
        onClose();
      },
    });
  }

  const errorText = localError ?? (create.isError ? apiErrorMessage(create.error) : null);

  return (
    <Sheet open={open} title="發一則公告" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {flags.canAnnounceSchool && (
          <Field label="發給誰" group>
            <Segmented
              label="公告範圍"
              options={[
                { value: 'SCHOOL', label: '全校' },
                { value: 'CLASS', label: '單一班級' },
              ]}
              value={scope}
              onChange={(v) => setScope(v as AnnouncementScope)}
            />
          </Field>
        )}

        {scope === 'CLASS' && (
          <Field label="哪一班">
            {classes && classes.length === 0 ? (
              <p className="text-sm text-ink-soft">你目前沒有帶班級。</p>
            ) : (
              <select
                aria-label="班級"
                value={classId ?? ''}
                onChange={(e) => setClassId(e.target.value)}
                className="field"
              >
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        <Field label="標題" hint="家長在列表上先看到的就是這一行">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (localError) setLocalError(null);
            }}
            maxLength={200}
            placeholder="例如：9/1 開學典禮"
            className="field"
          />
        </Field>

        <Field label="內容" error={errorText ?? undefined}>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (localError) setLocalError(null);
            }}
            rows={5}
            maxLength={5000}
            placeholder="時間、地點、要帶什麼…"
            className="field resize-none"
          />
        </Field>

        <Button type="submit" variant="primary" disabled={create.isPending}>
          {create.isPending ? '發布中…' : '發布公告'}
        </Button>
      </form>
    </Sheet>
  );
}
