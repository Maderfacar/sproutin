'use client';

import { useEffect, useState } from 'react';
import { apiErrorMessage } from '../../lib/api';
import { useBranding } from '../../lib/branding';
import { StatusScreen } from '../../components/StatusScreen';
import { uploadErrorMessage, useUploadImage } from '../school/hooks';
import { MenuPreview } from './MenuPreview';
import { richMenuErrorMessage, useApplyRichMenu, useRichMenus, useSaveRichMenu } from './hooks';
import {
  AUDIENCE_HINT,
  AUDIENCE_LABEL,
  CHAT_BAR_TEXT_MAX,
  TARGET_LABEL,
  TEMPLATE_SHAPE,
  targetsFor,
  cellCount,
  type RichMenuAudience,
  type RichMenuConfigView,
  type RichMenuItem,
  type RichMenuTarget,
  type RichMenuTemplate,
} from './types';
import { SkeletonCards } from '../../components/Skeleton';
import { Band } from '../../components/Band';
import { formatDateTime } from '../../lib/datetime';

const AUDIENCES: RichMenuAudience[] = ['PARENT', 'STAFF', 'UNBOUND'];
const TEMPLATES: RichMenuTemplate[] = ['SIX', 'FOUR', 'TWO'];

interface Draft {
  template: RichMenuTemplate;
  imageUrl: string | null;
  chatBarText: string;
  items: RichMenuItem[];
}

function toDraft(config: RichMenuConfigView): Draft {
  return {
    template: config.template,
    imageUrl: config.imageUrl,
    chatBarText: config.chatBarText,
    items: config.items,
  };
}

function isDirty(a: Draft, b: Draft): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

// 園所的 LINE 圖文選單設計（模板式：換底圖 + 選每格連到哪 + 填字，不做自由拉區域）。
//
// **儲存與套用是兩個動作**：LINE 的「建立選單」有每小時 100 次上限，而調版面時會存很多次。
// 儲存只寫我們自己的資料庫；按「套用到 LINE」才會真的動到 LINE。
export function RichMenuSection() {
  const branding = useBranding();
  const { data: configs, isLoading, isError, error } = useRichMenus();
  const save = useSaveRichMenu();
  const apply = useApplyRichMenu();
  const upload = useUploadImage();

  const [audience, setAudience] = useState<RichMenuAudience>('PARENT');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<number | null>(0);

  const current = configs?.find((c) => c.audience === audience) ?? null;

  // 切換對象或伺服器資料更新 → 重置草稿。
  useEffect(() => {
    if (current) {
      setDraft(toDraft(current));
      setSelected(0);
    }
  }, [current]);

  if (isLoading) {
    return <SkeletonCards cards={2} />;
  }
  if (isError || !configs || !current || !draft) {
    return <StatusScreen status="error" message={apiErrorMessage(error)} />;
  }

  const dirty = isDirty(draft, toDraft(current));
  const total = cellCount(draft.template);
  const change = (next: Partial<Draft>): void => setDraft({ ...draft, ...next });

  // 換版面時，超出新版面範圍的格子必須丟掉 —— 留著會在儲存時被後端擋下，
  // 但那時園長已經改了一堆東西，訊息很難懂。這裡直接清乾淨。
  const changeTemplate = (template: RichMenuTemplate): void => {
    const limit = cellCount(template);
    change({ template, items: draft.items.filter((i) => i.index < limit) });
  };

  const setCell = (index: number, target: RichMenuTarget | ''): void => {
    const rest = draft.items.filter((i) => i.index !== index);
    change({
      items: target ? [...rest, { index, target }].sort((a, b) => a.index - b.index) : rest,
    });
  };

  const pickImage = (file: File): void => {
    upload.mutate({ kind: 'richmenu', file }, { onSuccess: (url) => change({ imageUrl: url }) });
  };

  const currentTarget = (index: number): RichMenuTarget | '' =>
    draft.items.find((i) => i.index === index)?.target ?? '';

  const mutationError = save.error ?? apply.error;

  return (
    <Band
      kind="manage"
      title="LINE 圖文選單"
      description="家長在 LINE 裡最先看到的就是這排格子：選版面、放底圖、決定每格開哪一頁"
    >
      <section className="card p-5">
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => {
            const config = configs.find((c) => c.audience === a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={audience === a}
                onClick={() => setAudience(a)}
                className={`chip border transition ${
                  audience === a
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-line text-ink-soft hover:border-brand-primary'
                }`}
              >
                {AUDIENCE_LABEL[a]}
                {config?.isApplied && <span className="ml-1.5 text-2xs">已套用</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">{AUDIENCE_HINT[audience]}</p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16.25rem]">
          <div className="space-y-5">
            <div>
              <p className="eyebrow">版面</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {TEMPLATES.map((t) => {
                  const shape = TEMPLATE_SHAPE[t];
                  const active = draft.template === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={active}
                      onClick={() => changeTemplate(t)}
                      className={`rounded-md2 border p-2.5 transition ${
                        active ? 'border-brand-primary' : 'border-line hover:border-brand-primary'
                      }`}
                    >
                      <span
                        className="grid gap-[3px]"
                        style={{
                          gridTemplateColumns: `repeat(${shape.cols}, 1fr)`,
                          gridTemplateRows: `repeat(${shape.rows}, 1fr)`,
                          height: '34px',
                        }}
                        aria-hidden
                      >
                        {Array.from({ length: shape.cols * shape.rows }, (_, i) => (
                          <span
                            key={i}
                            className={`rounded-[2px] ${active ? 'bg-brand-primary/25' : 'bg-black/[0.06]'}`}
                          />
                        ))}
                      </span>
                      <span className="mt-1.5 block text-xs text-ink-soft">{shape.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="eyebrow">底圖</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="btn-secondary cursor-pointer text-sm">
                  {upload.isPending ? '上傳中…' : draft.imageUrl ? '換一張' : '上傳底圖'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={upload.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) pickImage(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {draft.imageUrl && (
                  <button
                    type="button"
                    onClick={() => change({ imageUrl: null })}
                    className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
                  >
                    移除底圖
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                LINE 的規定：PNG 或 JPG、不超過 1MB、寬 800–2500 像素、
                <span className="text-ink">寬要至少是高的 1.45 倍</span>（不能太方）。
                符合這些就可以，不必湊到特定尺寸——格子會照你的圖去切。
                常見尺寸：2500 × 1686（六格、四格）、2500 × 843（兩格）。
              </p>
              {upload.isError && (
                <p className="mt-1.5 text-xs text-red-700">{uploadErrorMessage(upload.error)}</p>
              )}
            </div>

            <div>
              <p className="eyebrow">每一格連到哪</p>
              <ul className="mt-2">
                {Array.from({ length: total }, (_, index) => (
                  <li
                    key={index}
                    className={`flex items-center gap-3 border-b border-line py-2.5 ${
                      selected === index ? 'bg-brand-primary/[0.04]' : ''
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md2 text-xs font-semibold ${
                        currentTarget(index)
                          ? 'bg-brand-primary/15 text-brand-primary'
                          : 'border border-line text-ink-soft'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <select
                      aria-label={`第 ${index + 1} 格連到哪`}
                      value={currentTarget(index)}
                      onFocus={() => setSelected(index)}
                      onChange={(e) => setCell(index, e.target.value as RichMenuTarget | '')}
                      className="field"
                    >
                      <option value="">不使用這一格</option>
                      {targetsFor(audience).map((t) => (
                        <option key={t} value={t}>
                          {TARGET_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>

            <label className="field-label">
              <span>
                聊天列上的文字（最多 {CHAT_BAR_TEXT_MAX} 字，LINE 的限制）
              </span>
              <input
                type="text"
                value={draft.chatBarText}
                maxLength={CHAT_BAR_TEXT_MAX}
                onChange={(e) => change({ chatBarText: e.target.value })}
                className="field"
              />
            </label>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <MenuPreview
              template={draft.template}
              imageUrl={draft.imageUrl}
              chatBarText={draft.chatBarText}
              items={draft.items}
              brandName={branding.brandName}
              selectedIndex={selected}
              onSelect={setSelected}
            />
            <p className="mt-2 text-center text-2xs leading-relaxed text-ink-soft">
              格線是實際可以點的區域。
              <br />
              確認底圖上的按鈕有對齊格線。
            </p>
          </div>
        </div>

        {mutationError && (
          <p role="alert" className="mt-4 text-sm leading-relaxed text-red-700">
            {richMenuErrorMessage(mutationError, apiErrorMessage(mutationError))}
          </p>
        )}
        {apply.isSuccess && !apply.isPending && (
          <p className="mt-4 rounded-md2 border border-line bg-black/[0.02] p-3 text-sm leading-relaxed text-ink">
            已送到 LINE。
            {audience === 'UNBOUND'
              ? '這份選單已設為預設，還沒綁定的人就會看到它。'
              : `已為 ${apply.data.linkedUsers} 位換上這份選單。`}
            {apply.data.skippedUsers > 0 && (
              <span className="mt-1 block text-ink-soft">
                另有 {apply.data.skippedUsers} 位被略過：LINE 不認得他們的帳號，
                通常是示範用的假資料、已刪除的 LINE 帳號，或還沒把園所的官方帳號加為好友。
                其他人不受影響。
              </span>
            )}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <span className="text-xs text-ink-soft">
            {dirty
              ? '尚未儲存的變更'
              : current.appliedAt
                ? `上次套用：${formatDateTime(current.appliedAt)}`
                : '還沒套用到 LINE'}
          </span>
          <button
            type="button"
            onClick={() => setDraft(toDraft(current))}
            disabled={!dirty || save.isPending}
            className="btn-secondary ml-auto text-sm"
          >
            復原
          </button>
          <button
            type="button"
            onClick={() => save.mutate({ audience, body: draft })}
            disabled={!dirty || save.isPending}
            className="btn-secondary text-sm"
          >
            {save.isPending ? '儲存中…' : '儲存設計'}
          </button>
          <button
            type="button"
            onClick={() => apply.mutate({ audience })}
            disabled={dirty || apply.isPending || !draft.imageUrl}
            title={dirty ? '請先儲存設計' : undefined}
            className="btn-primary text-sm"
          >
            {apply.isPending ? '套用中…' : '套用到 LINE'}
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          「儲存設計」只存在系統裡，隨時可以改；「套用到 LINE」才會真的換掉大家手機上的選單。
        </p>
      </section>
    </Band>
  );
}
