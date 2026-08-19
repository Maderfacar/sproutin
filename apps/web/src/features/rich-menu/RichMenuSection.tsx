'use client';

import { useEffect, useState } from 'react';
import { apiErrorMessage } from '../../lib/api';
import { useBranding } from '../../lib/branding';
import { formatDateTime } from '../../lib/datetime';
import { Badge, Button, ErrorNotice, Field, Segmented, SkeletonCards } from '../../components/ui';
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
// 所以主要按鈕跟著狀態換：**還沒存就是「儲存設計」，存好了才變成「套用到 LINE」**——
// 同時放三顆按鈕會讓人不知道現在該按哪一顆。
//
// 這裡只渲染編輯器本體，外框（底部面板）由 AppearanceEditor 負責 ——
// 因此桌面 /admin/appearance 與手機 /liff/admin/appearance 是同一份（docs/04 §3b）。
export function RichMenuSection() {
  const branding = useBranding();
  const { data: configs, isLoading, isError, error, refetch } = useRichMenus();
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
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
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

  const currentTarget = (index: number): RichMenuTarget | '' =>
    draft.items.find((i) => i.index === index)?.target ?? '';

  const mutationError = save.error ?? apply.error;

  return (
    <div className="flex flex-col gap-5">
      <Field label="設計給誰看" hint={AUDIENCE_HINT[audience]} group>
        <Segmented
          label="選單對象"
          options={AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABEL[a] }))}
          value={audience}
          onChange={setAudience}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={current.isApplied ? 'good' : 'neutral'}>
          {current.isApplied ? '已套用到 LINE' : '還沒套用到 LINE'}
        </Badge>
        {current.appliedAt && (
          <span className="text-2xs tabular-nums text-ink-mute">
            上次套用 {formatDateTime(current.appliedAt)}
          </span>
        )}
      </div>

      <Field label="版面" group>
        <div role="radiogroup" aria-label="選單版面" className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => {
            const shape = TEMPLATE_SHAPE[t];
            const active = draft.template === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changeTemplate(t)}
                className={`tappable flex min-h-touch flex-col items-center gap-1.5 rounded-md2 border-2 p-2.5 transition ${
                  active ? 'border-brand-primary bg-brand-wash' : 'border-line bg-surface'
                }`}
              >
                <span
                  aria-hidden
                  className="grid w-full gap-[3px]"
                  style={{
                    gridTemplateColumns: `repeat(${shape.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${shape.rows}, 1fr)`,
                    height: '34px',
                  }}
                >
                  {Array.from({ length: shape.cols * shape.rows }, (_, i) => (
                    <span
                      key={i}
                      className={`rounded-[2px] ${active ? 'bg-brand-primary/30' : 'bg-surface-sunk'}`}
                    />
                  ))}
                </span>
                <span
                  className={`block text-2xs font-semibold ${active ? 'text-brand-primary' : 'text-ink-soft'}`}
                >
                  {shape.label}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="底圖"
        hint="LINE 的規定：PNG 或 JPG、不超過 1MB、寬 800–2500 像素，寬要至少是高的 1.45 倍（不能太方）。符合這些就可以，不必湊到特定尺寸——格子會照你的圖去切。常見尺寸：2500 × 1686（六格、四格）、2500 × 843（兩格）。"
        error={upload.isError ? uploadErrorMessage(upload.error) : undefined}
        group
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="tappable inline-flex min-h-touch cursor-pointer items-center justify-center rounded-md2 border border-line-strong bg-surface px-5 py-3 font-semibold text-ink">
            {upload.isPending ? '上傳中…' : draft.imageUrl ? '換一張' : '上傳底圖'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              disabled={upload.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  upload.mutate(
                    { kind: 'richmenu', file },
                    { onSuccess: (url) => change({ imageUrl: url }) },
                  );
                }
                e.target.value = '';
              }}
            />
          </label>
          {draft.imageUrl && (
            <Button variant="danger" block={false} onClick={() => change({ imageUrl: null })}>
              移除底圖
            </Button>
          )}
        </div>
      </Field>

      <div className="flex flex-col items-center gap-2 border-t border-line pt-5">
        <MenuPreview
          template={draft.template}
          imageUrl={draft.imageUrl}
          chatBarText={draft.chatBarText}
          items={draft.items}
          brandName={branding.brandName}
          selectedIndex={selected}
          onSelect={setSelected}
        />
        <p className="text-center text-2xs leading-relaxed text-ink-mute">
          格線是實際可以點的區域。確認底圖上的按鈕有對齊格線。
        </p>
      </div>

      <Field label="每一格連到哪" group>
        <ul className="flex flex-col gap-2">
          {Array.from({ length: total }, (_, index) => (
            <li
              key={index}
              className={`flex items-center gap-3 rounded-md2 px-1 py-1 ${
                selected === index ? 'bg-brand-wash' : ''
              }`}
            >
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md2 text-sm font-bold ${
                  currentTarget(index)
                    ? 'bg-brand-primary text-white'
                    : 'border border-line text-ink-mute'
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
      </Field>

      <Field label={`聊天列上的文字（最多 ${CHAT_BAR_TEXT_MAX} 字，LINE 的限制）`}>
        <input
          type="text"
          value={draft.chatBarText}
          maxLength={CHAT_BAR_TEXT_MAX}
          onChange={(e) => change({ chatBarText: e.target.value })}
          className="field"
        />
      </Field>

      {mutationError && (
        <ErrorNotice
          message={richMenuErrorMessage(mutationError, apiErrorMessage(mutationError))}
        />
      )}

      {apply.isSuccess && !apply.isPending && (
        <div className="rounded-md2 border border-good-edge bg-good-wash px-4 py-3 text-sm leading-relaxed text-good-text">
          已送到 LINE。
          {audience === 'UNBOUND'
            ? '這份選單已設為預設，還沒綁定的人就會看到它。'
            : `已為 ${apply.data.linkedUsers} 位換上這份選單。`}
          {apply.data.skippedUsers > 0 && (
            <span className="mt-1 block">
              另有 {apply.data.skippedUsers} 位被略過：LINE 不認得他們的帳號，
              通常是示範用的假資料、已刪除的 LINE 帳號，或還沒把園所的官方帳號加為好友。
              其他人不受影響。
            </span>
          )}
        </div>
      )}

      {/* 主要按鈕跟著狀態換：改到一半就是「先存起來」，存好了才是「送去 LINE」。 */}
      <div className="flex flex-col gap-2 border-t border-line pt-5">
        {dirty ? (
          <>
            <Button
              variant="primary"
              onClick={() => save.mutate({ audience, body: draft })}
              disabled={save.isPending}
            >
              {save.isPending ? '儲存中…' : '儲存設計'}
            </Button>
            <Button
              variant="text"
              onClick={() => setDraft(toDraft(current))}
              disabled={save.isPending}
            >
              復原這次的修改
            </Button>
            <p className="text-2xs leading-relaxed text-ink-soft">
              「儲存設計」只存在系統裡，隨時可以改。存好之後這顆按鈕才會變成「套用到 LINE」。
            </p>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              onClick={() => apply.mutate({ audience })}
              disabled={apply.isPending || !draft.imageUrl}
            >
              {apply.isPending ? '套用中…' : '套用到 LINE'}
            </Button>
            <p className="text-2xs leading-relaxed text-ink-soft">
              {draft.imageUrl
                ? '按下去才會真的換掉大家手機上的選單。'
                : '還沒有底圖 —— LINE 的選單一定要有一張圖，先上傳一張才能套用。'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
