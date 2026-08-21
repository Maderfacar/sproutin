'use client';

import { useState, type FormEvent } from 'react';
import { useSelectedClass } from '../classes/hooks';
import { announcementErrorMessage, useCreateAnnouncement, useUpdateAnnouncement } from './hooks';
import { useCapabilities } from '../../lib/useCapabilities';
import { apiErrorMessage } from '../../lib/api';
import type { AnnouncementScope, AnnouncementView } from '../../lib/types';
import { Button, Field, Segmented, Sheet } from '../../components/ui';

// 發一則公告。從底部滑上來 —— 公告頁多數時候是來看有沒有新的，發布是例外。
//
// 老師只能發給自己帶的班（班級清單已依身分縮小，見 useVisibleClasses）；
// 園長／行政可以選全校或某一個班。
//
// **依身分不是角色聯集**（Human Owner 2026-08-20 回報：老師在公告頁可以發全校公告）：
// 園長兼導師的人切到老師身分時，全校那個選項不該還在 —— 導師的形狀是「我這一班」。
// 要發全校就切回園長身分。
//
// 同一個面板也負責**編輯**（傳 editing）。刻意共用而不是再做一份：兩邊要填的欄位一樣，
// 分成兩個元件遲早會有一邊的驗證或字數上限改動漏掉。
// 呼叫端請用 key={editing?.id ?? 'new'} 讓它重新掛載 —— 欄位初始值直接取自 props。
interface AnnounceSheetProps {
  open: boolean;
  onClose: () => void;
  /** 有值＝編輯這一則；沒有＝發新的一則。 */
  editing?: AnnouncementView | null;
}

export function AnnounceSheet({ open, onClose, editing = null }: AnnounceSheetProps) {
  const flags = useCapabilities();
  const { classes, classId, setClassId } = useSelectedClass();
  const isEditing = editing !== null;

  const [scope, setScope] = useState<AnnouncementScope>(
    editing?.scope ?? (flags.canAnnounceSchool ? 'SCHOOL' : 'CLASS'),
  );
  const [title, setTitle] = useState(editing?.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [localError, setLocalError] = useState<string | null>(null);
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const pending = create.isPending || update.isPending;

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

    if (isEditing) {
      // 只送真的改過的欄位 —— 兩個都沒動時後端會回 no_changes，那是對的，
      // 但在這裡先擋下來，使用者不必為了一個沒有意義的往返等一次網路。
      const patch: { title?: string; body?: string } = {};
      if (title.trim() !== editing.title) patch.title = title.trim();
      if (body.trim() !== editing.body) patch.body = body.trim();
      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }
      update.mutate({ id: editing.id, patch }, { onSuccess: () => onClose() });
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

  const mutationError = update.error ?? create.error ?? null;
  const errorText =
    localError ??
    (mutationError ? announcementErrorMessage(mutationError, apiErrorMessage(mutationError)) : null);

  return (
    <Sheet open={open} title={isEditing ? '編輯公告' : '發一則公告'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* 編輯時不給改對象。改了範圍等於變成另一則公告 —— 已經收到通知的人與
            現在看得到的人會對不起來。講出來，不要只是把選項藏掉。 */}
        {isEditing && (
          <p className="rounded-md2 border border-line bg-surface-sunk px-4 py-3 text-2xs leading-relaxed text-ink-soft">
            {editing.scope === 'SCHOOL' ? '這是一則全校公告。' : '這是一則班級公告。'}
            發送對象不能修改，要換對象請刪掉重發。
            <br />
            修改內容<strong className="font-bold text-ink">不會</strong>再推播一次 ——
            已經收到的人不會被打擾第二次。
          </p>
        )}

        {!isEditing && flags.canAnnounceSchool && (
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

        {!isEditing && scope === 'CLASS' && (
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

        <Button type="submit" variant="primary" disabled={pending}>
          {isEditing
            ? update.isPending
              ? '儲存中…'
              : '儲存修改'
            : create.isPending
              ? '發布中…'
              : '發布公告'}
        </Button>
      </form>
    </Sheet>
  );
}
