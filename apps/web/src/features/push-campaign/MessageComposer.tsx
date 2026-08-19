'use client';

import { useState } from 'react';
import { apiErrorMessage } from '../../lib/api';
import { useBranding } from '../../lib/branding';
import { useMyClasses } from '../classes/hooks';
import { uploadErrorMessage, useUploadImage } from '../school/hooks';
import { Button, ErrorNotice, Field, Segmented, StateCard } from '../../components/ui';
import { CardPreview } from './CardPreview';
import { campaignErrorMessage, useCreateCampaign, useRecipientPreview } from './hooks';
import {
  APP_PAGE_LABEL,
  APP_PAGE_VALUES,
  AUDIENCE_HINT,
  AUDIENCE_LABEL,
  BODY_MAX,
  BUTTON_LABEL_MAX,
  FIELD_VALUE_MAX,
  TEMPLATES,
  TEMPLATE_VALUES,
  TITLE_MAX,
  type AppPage,
  type CampaignAudience,
  type CampaignTemplate,
} from './types';

const AUDIENCES: CampaignAudience[] = ['ALL_PARENTS', 'CLASS', 'STAFF'];
type ButtonKind = 'none' | 'app' | 'external';

const BUTTON_KINDS: { value: ButtonKind; label: string }[] = [
  { value: 'none', label: '不放按鈕' },
  { value: 'app', label: '連到 App 的頁面' },
  { value: 'external', label: '連到外部網址' },
];

// 發送訊息的填寫端（版型填空 → 選收件範圍 → 確認則數 → 送出）。
// 住在 PushCampaignPanel 的底部面板裡，所以是單欄的：填 → 看預覽 → 送。
//
// **兩段式送出是這個元件存在的理由，只換視覺不動流程（Human Owner 已定案）**：
// LINE 沒有撤回已送出推播的方法，按錯就是全校家長都收到了。因此第一顆按鈕只是「準備送出」，
// 把「會送出幾則」與「無法收回」攤在眼前，第二顆才真的送。這比一個確認對話框好 ——
// 對話框會被習慣性地按掉。任何內容改動都會退回第一段，避免看著舊的則數按下確定。
export function MessageComposer({ onClose }: { onClose: () => void }) {
  const branding = useBranding();
  // 後台管理頁的例外：這一頁只有園長／行政進得來，要發給哪一班本來就是全校的範圍
  // （docs/04 §3c「切換身分的六個坑」② 的但書）。
  const { data: classes } = useMyClasses();
  const upload = useUploadImage();
  const create = useCreateCampaign();

  const [template, setTemplate] = useState<CampaignTemplate>('GENERAL');
  const [audience, setAudience] = useState<CampaignAudience>('ALL_PARENTS');
  const [classId, setClassId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [buttonKind, setButtonKind] = useState<ButtonKind>('none');
  const [buttonLabel, setButtonLabel] = useState('開啟 App');
  const [buttonPage, setButtonPage] = useState<AppPage>('announcement');
  const [buttonUrl, setButtonUrl] = useState('');
  const [confirming, setConfirming] = useState(false);

  const selectedClassId = audience === 'CLASS' ? classId || null : null;
  const preview = useRecipientPreview(audience, selectedClassId);
  const spec = TEMPLATES[template];
  const classList = classes ?? [];

  const titleReady = title.trim().length > 0;
  const classReady = audience !== 'CLASS' || Boolean(classId);
  const buttonReady =
    buttonKind === 'none' ||
    (buttonLabel.trim().length > 0 &&
      (buttonKind === 'app' || buttonUrl.trim().startsWith('https://')));
  const ready = titleReady && classReady && buttonReady;
  const willReceive = preview.data?.willReceive ?? 0;
  const unbound = preview.data?.unbound ?? 0;

  // 任何內容改動都要退回第一段 —— 看著「12 則」按下確定、內容卻已經改過，是最糟的一種錯。
  function edited(): void {
    setConfirming(false);
  }

  // 送出後把表單清乾淨 —— 留著上一則內容，下一次很容易改到一半就按送出。
  function reset(): void {
    setTitle('');
    setBody('');
    setImageUrl(null);
    setFields({});
    setButtonKind('none');
    setButtonUrl('');
    setConfirming(false);
  }

  function submit(): void {
    create.mutate(
      {
        template,
        audience,
        classId: selectedClassId,
        title: title.trim(),
        body: body.trim(),
        imageUrl,
        fields,
        button:
          buttonKind === 'none'
            ? null
            : buttonKind === 'app'
              ? { label: buttonLabel.trim(), page: buttonPage }
              : { label: buttonLabel.trim(), url: buttonUrl.trim() },
      },
      { onSuccess: reset },
    );
  }

  // 送出成功之後面板整個換成一句回覆。**不自動關掉**：送出是不可收回的動作，
  // 使用者需要看到「真的送出去了、幾則」，直接關掉等於把那句回覆藏起來。
  if (create.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <StateCard
          eyebrow="已排入送出"
          headline={`${create.data.recipientCount} 則`}
          detail="一則一則送，需要一點時間。實際送到幾個人請看「送出紀錄」。"
          tone="good"
        />
        <Button
          variant="primary"
          onClick={() => {
            create.reset();
            onClose();
          }}
        >
          回到送出紀錄
        </Button>
      </div>
    );
  }

  const rangeLabel =
    audience === 'CLASS'
      ? (classList.find((c) => c.id === classId)?.name ?? '指定班級')
      : AUDIENCE_LABEL[audience];

  return (
    // noValidate，而且整份表單沒有 submit 型別的按鈕：驗證自己來，Enter 也不會意外送出。
    // 群發送出後收不回來，鍵盤上的一下 Enter 絕不可以是送出的路徑。
    <form onSubmit={(e) => e.preventDefault()} noValidate className="flex flex-col gap-5">
      <Field label="版型" hint={spec.hint} group>
        <Segmented
          label="訊息版型"
          options={TEMPLATE_VALUES.map((t) => ({ value: t, label: TEMPLATES[t].label }))}
          value={template}
          onChange={(t) => {
            setTemplate(t);
            setFields({}); // 換版型 → 舊欄位不留（後端也只收該版型認得的欄位）
            edited();
          }}
        />
      </Field>

      <Field label={`標題（最多 ${TITLE_MAX} 字）`}>
        <input
          type="text"
          value={title}
          maxLength={TITLE_MAX}
          placeholder="中秋節親子活動"
          onChange={(e) => {
            setTitle(e.target.value);
            edited();
          }}
          className="field"
        />
      </Field>

      {spec.fields.map((f) => (
        <Field key={f.key} label={f.label}>
          <input
            type="text"
            value={fields[f.key] ?? ''}
            maxLength={FIELD_VALUE_MAX}
            placeholder={f.placeholder}
            onChange={(e) => {
              setFields({ ...fields, [f.key]: e.target.value });
              edited();
            }}
            className="field"
          />
        </Field>
      ))}

      <Field label={`內文（選填，最多 ${BODY_MAX} 字）`}>
        <textarea
          value={body}
          maxLength={BODY_MAX}
          rows={4}
          placeholder="當天請讓孩子穿著方便活動的衣物，並準備一個小水壺。"
          onChange={(e) => {
            setBody(e.target.value);
            edited();
          }}
          className="field resize-none"
        />
      </Field>

      <Field
        label="圖片（選填）"
        hint="PNG 或 JPG、1MB 以內。家長是用手機流量看的，圖不必大。"
        error={upload.isError ? uploadErrorMessage(upload.error) : undefined}
        group
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="tappable inline-flex min-h-touch cursor-pointer items-center justify-center rounded-md2 border border-line-strong bg-surface px-5 py-3 font-semibold text-ink">
            {upload.isPending ? '上傳中…' : imageUrl ? '換一張' : '上傳圖片'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              disabled={upload.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  upload.mutate(
                    { kind: 'campaign', file },
                    { onSuccess: (url) => setImageUrl(url) },
                  );
                }
                e.target.value = '';
              }}
            />
          </label>
          {imageUrl && (
            <Button variant="text" onClick={() => setImageUrl(null)}>
              移除圖片
            </Button>
          )}
        </div>
      </Field>

      <Field label="按鈕（選填）" group>
        <Segmented
          label="卡片上要不要放按鈕"
          options={BUTTON_KINDS}
          value={buttonKind}
          onChange={(kind) => {
            setButtonKind(kind);
            edited();
          }}
        />
      </Field>

      {buttonKind !== 'none' && (
        <>
          <Field label={`按鈕上的文字（最多 ${BUTTON_LABEL_MAX} 字）`}>
            <input
              type="text"
              value={buttonLabel}
              maxLength={BUTTON_LABEL_MAX}
              onChange={(e) => {
                setButtonLabel(e.target.value);
                edited();
              }}
              className="field"
            />
          </Field>

          {buttonKind === 'app' ? (
            // App 的頁面有六個，超過分段選擇器攤得開的數量，維持原生下拉。
            <Field label="連到哪一頁">
              <select
                value={buttonPage}
                onChange={(e) => {
                  setButtonPage(e.target.value as AppPage);
                  edited();
                }}
                className="field"
              >
                {APP_PAGE_VALUES.map((p) => (
                  <option key={p} value={p}>
                    {APP_PAGE_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field
              label="網址（必須是 https 開頭）"
              hint="外部網址由園所自行負責：我們無法確認那個頁面安全或還活著。貼上之前請自己點一次確認，尤其是報名表單這類會收家長個資的連結。"
            >
              <input
                type="url"
                value={buttonUrl}
                placeholder="https://forms.gle/..."
                onChange={(e) => {
                  setButtonUrl(e.target.value);
                  edited();
                }}
                className="field"
              />
            </Field>
          )}
        </>
      )}

      <Field label="送給誰" hint={AUDIENCE_HINT[audience].replace(/\*\*/g, '')} group>
        <Segmented
          label="收件範圍"
          options={AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABEL[a] }))}
          value={audience}
          onChange={(a) => {
            setAudience(a);
            edited();
          }}
        />
      </Field>

      {audience === 'CLASS' &&
        (classList.length <= 3 ? (
          <Field label="哪一班" group>
            <Segmented
              label="班級"
              options={classList.map((c) => ({ value: c.id, label: c.name }))}
              value={classId || undefined}
              onChange={(id) => {
                setClassId(id);
                edited();
              }}
            />
          </Field>
        ) : (
          <Field label="哪一班">
            <select
              aria-label="班級"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                edited();
              }}
              className="field"
            >
              <option value="">請選擇班級</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        ))}

      <div className="flex flex-col items-center gap-2 border-t border-line pt-5">
        <CardPreview
          template={template}
          brandName={branding.brandName}
          title={title}
          body={body}
          imageUrl={imageUrl}
          fields={fields}
          buttonLabel={buttonKind === 'none' ? '' : buttonLabel}
        />
        <p className="text-center text-2xs leading-relaxed text-ink-mute">
          家長在 LINE 裡看到的樣子。沒填的欄位不會出現。
        </p>
      </div>

      {create.isError && (
        <ErrorNotice message={campaignErrorMessage(create.error, apiErrorMessage(create.error))} />
      )}

      {!confirming ? (
        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <p className="text-2xs leading-relaxed text-ink-soft">
            {!classReady && '請先選擇班級'}
            {classReady && preview.isLoading && '正在計算人數…'}
            {classReady &&
              preview.data &&
              `目前這個範圍：${willReceive} 位收得到` +
                (unbound > 0 ? `，另有 ${unbound} 位還沒綁定 LINE（收不到）` : '')}
          </p>
          <Button
            variant="primary"
            onClick={() => setConfirming(true)}
            disabled={!ready || preview.isLoading || create.isPending}
          >
            準備送出
          </Button>
        </div>
      ) : (
        // 第二段。整塊用 note 色（停一下再想一次），不是 stop —— 這不是錯誤，
        // 是一個要負責的決定。
        <div className="rounded-tile border border-note-edge bg-note-wash p-4 text-note-text">
          <p className="font-serif text-xl font-bold leading-tight">
            這次會送出 {willReceive} 則（{rangeLabel}）
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            <span className="font-bold">送出後無法收回。</span>
            每一則都會出現在家長的 LINE 裡，也會計入 LINE 的推播用量。
            {unbound > 0 && (
              <span className="mt-1 block">
                另有 {unbound} 位還沒綁定 LINE —— 他們收不到這則訊息。
              </span>
            )}
          </p>
          {willReceive === 0 && (
            <p className="mt-2 text-sm font-semibold">這個範圍目前沒有人收得到，沒有東西可以送。</p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={submit}
              disabled={create.isPending || willReceive === 0}
            >
              {create.isPending ? '送出中…' : `確定送出 ${willReceive} 則`}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={create.isPending}
            >
              再檢查一下
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
