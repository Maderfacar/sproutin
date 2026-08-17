'use client';

import { useState } from 'react';
import { apiErrorMessage } from '../../lib/api';
import { useBranding } from '../../lib/branding';
import { useMyClasses } from '../classes/hooks';
import { uploadErrorMessage, useUploadImage } from '../school/hooks';
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

// 發送訊息（版型填空 → 選收件範圍 → 確認則數 → 送出）。
//
// **兩段式送出**是刻意的：LINE 沒有撤回已送出推播的方法，按錯就是全校家長都收到了。
// 因此第一顆按鈕只是「準備送出」，把「會送出幾則」與「無法收回」攤在眼前，
// 第二顆才真的送。這比一個確認對話框好 —— 對話框會被習慣性地按掉。
export function MessageComposer() {
  const branding = useBranding();
  const classes = useMyClasses();
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

  const selectedClassId = audience === 'CLASS' ? (classId || null) : null;
  const preview = useRecipientPreview(audience, selectedClassId);
  const spec = TEMPLATES[template];

  const titleReady = title.trim().length > 0;
  const classReady = audience !== 'CLASS' || Boolean(classId);
  const buttonReady =
    buttonKind === 'none' ||
    (buttonLabel.trim().length > 0 &&
      (buttonKind === 'app' || buttonUrl.trim().startsWith('https://')));
  const ready = titleReady && classReady && buttonReady;

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

  return (
    <section className="card p-5">
      <p className="section-title">發送訊息</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        直接送到家長的 LINE。<span className="text-ink">送出後沒有辦法收回</span>，
        所以請在按下最後一顆按鈕之前確認人數與內容。
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          <div>
            <p className="eyebrow">版型</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {TEMPLATE_VALUES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={template === t}
                  onClick={() => {
                    setTemplate(t);
                    setFields({}); // 換版型 → 舊欄位不留（後端也只收該版型認得的欄位）
                    setConfirming(false);
                  }}
                  className={`rounded-md2 border p-2.5 text-left transition ${
                    template === t ? 'border-brand-primary' : 'border-line hover:border-brand-primary'
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink">{TEMPLATES[t].label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">{spec.hint}</p>
          </div>

          <label className="field-label">
            <span>標題（最多 {TITLE_MAX} 字）</span>
            <input
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              placeholder="中秋節親子活動"
              onChange={(e) => {
                setTitle(e.target.value);
                setConfirming(false);
              }}
              className="field"
            />
          </label>

          {spec.fields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {spec.fields.map((f) => (
                <label key={f.key} className="field-label">
                  <span>{f.label}</span>
                  <input
                    type="text"
                    value={fields[f.key] ?? ''}
                    maxLength={FIELD_VALUE_MAX}
                    placeholder={f.placeholder}
                    onChange={(e) => {
                      setFields({ ...fields, [f.key]: e.target.value });
                      setConfirming(false);
                    }}
                    className="field"
                  />
                </label>
              ))}
            </div>
          )}

          <label className="field-label">
            <span>內文（選填，最多 {BODY_MAX} 字）</span>
            <textarea
              value={body}
              maxLength={BODY_MAX}
              rows={4}
              placeholder="當天請讓孩子穿著方便活動的衣物，並準備一個小水壺。"
              onChange={(e) => {
                setBody(e.target.value);
                setConfirming(false);
              }}
              className="field"
            />
          </label>

          <div>
            <p className="eyebrow">圖片（選填）</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="btn-secondary cursor-pointer text-sm">
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
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
                >
                  移除圖片
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              PNG 或 JPG、1MB 以內。家長是用手機流量看的，圖不必大。
            </p>
            {upload.isError && (
              <p className="mt-1.5 text-xs text-red-700">{uploadErrorMessage(upload.error)}</p>
            )}
          </div>

          <div>
            <p className="eyebrow">按鈕（選填）</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ['none', '不放按鈕'],
                  ['app', '連到 App 的頁面'],
                  ['external', '連到外部網址'],
                ] as [ButtonKind, string][]
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={buttonKind === kind}
                  onClick={() => {
                    setButtonKind(kind);
                    setConfirming(false);
                  }}
                  className={`chip border transition ${
                    buttonKind === kind
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-line text-ink-soft hover:border-brand-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {buttonKind !== 'none' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="field-label">
                  <span>按鈕上的文字（最多 {BUTTON_LABEL_MAX} 字）</span>
                  <input
                    type="text"
                    value={buttonLabel}
                    maxLength={BUTTON_LABEL_MAX}
                    onChange={(e) => {
                      setButtonLabel(e.target.value);
                      setConfirming(false);
                    }}
                    className="field"
                  />
                </label>
                {buttonKind === 'app' ? (
                  <label className="field-label">
                    <span>連到哪一頁</span>
                    <select
                      value={buttonPage}
                      onChange={(e) => {
                        setButtonPage(e.target.value as AppPage);
                        setConfirming(false);
                      }}
                      className="field"
                    >
                      {APP_PAGE_VALUES.map((p) => (
                        <option key={p} value={p}>
                          {APP_PAGE_LABEL[p]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="field-label">
                    <span>網址（必須是 https 開頭）</span>
                    <input
                      type="url"
                      value={buttonUrl}
                      placeholder="https://forms.gle/..."
                      onChange={(e) => {
                        setButtonUrl(e.target.value);
                        setConfirming(false);
                      }}
                      className="field"
                    />
                  </label>
                )}
              </div>
            )}

            {buttonKind === 'external' && (
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                外部網址由園所自行負責：
                <span className="text-ink">我們無法確認那個頁面安全或還活著</span>。
                貼上之前請自己點一次確認，尤其是報名表單這類會收家長個資的連結。
              </p>
            )}
          </div>

          <div>
            <p className="eyebrow">送給誰</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={audience === a}
                  onClick={() => {
                    setAudience(a);
                    setConfirming(false);
                  }}
                  className={`chip border transition ${
                    audience === a
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-line text-ink-soft hover:border-brand-primary'
                  }`}
                >
                  {AUDIENCE_LABEL[a]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {AUDIENCE_HINT[audience].replace(/\*\*/g, '')}
            </p>

            {audience === 'CLASS' && (
              <label className="field-label mt-3">
                <span>班級</span>
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setConfirming(false);
                  }}
                  className="field"
                >
                  <option value="">請選擇班級</option>
                  {(classes.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <CardPreview
            template={template}
            brandName={branding.brandName}
            title={title}
            body={body}
            imageUrl={imageUrl}
            fields={fields}
            buttonLabel={buttonKind === 'none' ? '' : buttonLabel}
          />
          <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-soft">
            家長在 LINE 裡看到的樣子。
            <br />
            沒填的欄位不會出現。
          </p>
        </div>
      </div>

      {create.isError && (
        <p role="alert" className="mt-4 text-sm leading-relaxed text-red-700">
          {campaignErrorMessage(create.error, apiErrorMessage(create.error))}
        </p>
      )}

      {create.isSuccess && (
        <p className="mt-4 rounded-md2 border border-line bg-black/[0.02] p-3 text-sm leading-relaxed text-ink">
          已排入送出，將送出 {create.data.recipientCount} 則。
          <span className="mt-1 block text-ink-soft">
            送出需要一點時間（一則一則送）。實際結果請看下方的「送出紀錄」。
          </span>
        </p>
      )}

      <div className="mt-5 border-t border-line pt-4">
        {!confirming ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-ink-soft">
              {preview.isLoading && classReady && '正在計算人數…'}
              {!classReady && '請先選擇班級'}
              {preview.data &&
                classReady &&
                `目前這個範圍：${preview.data.willReceive} 位收得到` +
                  (preview.data.unbound > 0
                    ? `，另有 ${preview.data.unbound} 位還沒綁定 LINE（收不到）`
                    : '')}
            </span>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!ready || preview.isLoading || create.isPending}
              className="btn-primary ml-auto text-sm"
            >
              準備送出
            </button>
          </div>
        ) : (
          <div className="rounded-md2 border border-brand-primary/40 bg-brand-primary/[0.04] p-4">
            <p className="text-sm font-semibold text-ink">
              這次會送出 {preview.data?.willReceive ?? 0} 則
              {AUDIENCE_LABEL[audience] === '指定班級'
                ? `（${(classes.data ?? []).find((c) => c.id === classId)?.name ?? ''}）`
                : `（${AUDIENCE_LABEL[audience]}）`}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              <span className="text-ink">送出後無法收回。</span>
              每一則都會出現在家長的 LINE 裡，也會計入 LINE 的推播用量。
              {(preview.data?.unbound ?? 0) > 0 && (
                <span className="mt-1 block">
                  另有 {preview.data?.unbound} 位還沒綁定 LINE —— 他們收不到這則訊息。
                </span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={create.isPending}
                className="btn-secondary text-sm"
              >
                再檢查一下
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={create.isPending || (preview.data?.willReceive ?? 0) === 0}
                className="btn-primary text-sm"
              >
                {create.isPending
                  ? '送出中…'
                  : `確定送出 ${preview.data?.willReceive ?? 0} 則`}
              </button>
              {(preview.data?.willReceive ?? 0) === 0 && (
                <span className="text-xs text-ink-soft">
                  這個範圍目前沒有人收得到，沒有東西可以送。
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
