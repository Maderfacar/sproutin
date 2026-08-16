'use client';

import { useRef, useState } from 'react';
import type { SchoolAdminConfig } from '@sproutin/shared';
import { Icon } from '../../components/Icon';
import { BANNER_PRESETS, COLOR_PRESETS, LOGO_PRESETS, type ImagePreset } from './presets';
import { uploadErrorMessage, useUploadImage, type UploadKind } from './hooks';

type Draft = SchoolAdminConfig;

interface BrandSectionProps {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}

// 圖片欄位（logo / 封面）：內建圖庫 → 上傳 → 貼網址 → 移除。
function ImageField({
  kind,
  label,
  hint,
  presets,
  value,
  round,
  onChange,
}: {
  kind: UploadKind;
  label: string;
  hint: string;
  presets: readonly ImagePreset[];
  value: string | null;
  round: boolean;
  onChange: (url: string | null) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const [urlDraft, setUrlDraft] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFile = (file: File | undefined): void => {
    if (!file) return;
    upload.mutate({ kind, file }, { onSuccess: (url) => onChange(url) });
  };

  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-xs text-ink-soft">{hint}</p>

      <div className="mt-3 flex items-center gap-4">
        <span
          className={`flex shrink-0 items-center justify-center overflow-hidden border border-line bg-surface ${
            round ? 'h-16 w-16 rounded-full' : 'h-16 w-28 rounded-md2'
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="image" className="h-6 w-6 text-ink-soft" />
          )}
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
            className="btn-secondary text-sm"
          >
            {upload.isPending ? '上傳中…' : '上傳圖片'}
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput((v) => !v)}
            className="btn-secondary text-sm"
          >
            貼網址
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="btn-secondary text-sm">
              移除
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {upload.isError && (
        <p className="mt-2 text-xs text-red-700">{uploadErrorMessage(upload.error)}</p>
      )}

      {showUrlInput && (
        <div className="mt-3 flex gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://…"
            className="field text-sm"
          />
          <button
            type="button"
            className="btn-secondary shrink-0 text-sm"
            onClick={() => {
              if (urlDraft.startsWith('http')) {
                onChange(urlDraft);
                setUrlDraft('');
                setShowUrlInput(false);
              }
            }}
          >
            套用
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.url)}
            aria-pressed={value === preset.url}
            title={preset.label}
            className={`overflow-hidden rounded-md2 border transition ${
              value === preset.url ? 'border-brand-primary' : 'border-line hover:border-brand-primary'
            } ${round ? 'h-12 w-12 rounded-full' : 'h-12 w-20'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// 園所識別：名稱 + 色彩 + logo + 封面。改動即時反映在畫面上（儲存後才寫回園所資料）。
export function BrandSection({ draft, onChange }: BrandSectionProps) {
  return (
    <section className="rise-in card space-y-6 p-5">
      <div>
        <p className="section-title">園所識別</p>
        <p className="mt-1 text-sm text-ink-soft">家長打開 App 第一眼看到的樣子。</p>
      </div>

      <label className="field-label">
        園所名稱
        <input
          type="text"
          value={draft.brandName}
          maxLength={60}
          onChange={(e) => onChange({ brandName: e.target.value })}
          className="field"
        />
      </label>

      <div>
        <p className="eyebrow">代表色</p>
        <p className="mt-1 text-xs text-ink-soft">主色用於按鈕與重點，副色用於輔助點綴。</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => {
            const active = draft.primaryColor.toLowerCase() === preset.primary.toLowerCase();
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange({ primaryColor: preset.primary, secondaryColor: preset.secondary })
                }
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-semibold transition ${
                  active ? 'border-brand-primary text-ink' : 'border-line text-ink-soft hover:border-brand-primary'
                }`}
              >
                <span
                  className="h-5 w-5 rounded-full border border-black/5"
                  style={{ background: preset.primary }}
                  aria-hidden
                />
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="field-label">
            主色
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={draft.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-md2 border border-line bg-surface"
                aria-label="主色"
              />
              <span className="text-sm tabular-nums text-ink">{draft.primaryColor}</span>
            </span>
          </label>
          <label className="field-label">
            副色
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={draft.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-md2 border border-line bg-surface"
                aria-label="副色"
              />
              <span className="text-sm tabular-nums text-ink">{draft.secondaryColor}</span>
            </span>
          </label>
        </div>
      </div>

      <ImageField
        kind="logo"
        label="園徽 / Logo"
        hint="顯示於每一頁的左上角，建議正方形。"
        presets={LOGO_PRESETS}
        value={draft.logoUrl}
        round
        onChange={(logoUrl) => onChange({ logoUrl })}
      />

      <ImageField
        kind="banner"
        label="首頁封面"
        hint="顯示於頁首下方，建議橫幅比例；留空則不顯示。"
        presets={BANNER_PRESETS}
        value={draft.bannerUrl}
        round={false}
        onChange={(bannerUrl) => onChange({ bannerUrl })}
      />
    </section>
  );
}
