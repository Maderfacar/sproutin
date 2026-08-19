'use client';

import { useRef, useState } from 'react';
import type { SchoolAdminConfig } from '@sproutin/shared';
import { Icon } from '../../components/Icon';
import { Button, Field } from '../../components/ui';
import { BANNER_PRESETS, COLOR_PRESETS, LOGO_PRESETS, type ImagePreset } from './presets';
import { uploadErrorMessage, useUploadImage, type UploadKind } from './hooks';

type Draft = SchoolAdminConfig;

interface BrandSectionProps {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}

// 圖片欄位（logo / 封面）：先看到現在長什麼樣 → 換一張（上傳 / 貼網址 / 內建圖庫）→ 移除。
//
// 三種來源刻意都留著：園所大多直接挑內建圖庫；有設計師的園所會上傳；
// 已經有官網的園所常常只想貼一個現成網址。少掉任何一種，就會有園所卡在這一步。
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
    <Field
      label={label}
      hint={hint}
      error={upload.isError ? uploadErrorMessage(upload.error) : undefined}
      group
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex shrink-0 items-center justify-center overflow-hidden border border-line-strong bg-surface ${
            round ? 'h-16 w-16 rounded-full' : 'h-16 w-28 rounded-md2'
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="image" className="h-6 w-6 text-ink-mute" />
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <Button
            variant="secondary"
            block={false}
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? '上傳中…' : '上傳'}
          </Button>
          <Button variant="secondary" block={false} onClick={() => setShowUrlInput((v) => !v)}>
            貼網址
          </Button>
          {value && (
            <Button variant="danger" block={false} onClick={() => onChange(null)}>
              移除
            </Button>
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

      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            aria-label={`${label}的圖片網址`}
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://…"
            className="field"
          />
          <Button
            variant="secondary"
            block={false}
            onClick={() => {
              if (urlDraft.startsWith('http')) {
                onChange(urlDraft);
                setUrlDraft('');
                setShowUrlInput(false);
              }
            }}
          >
            套用
          </Button>
        </div>
      )}

      <p className="text-2xs text-ink-mute">或從內建圖庫挑一張</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.url)}
            aria-pressed={value === preset.url}
            title={preset.label}
            className={`tappable overflow-hidden border-2 transition ${
              value === preset.url ? 'border-brand-primary' : 'border-line'
            } ${round ? 'h-12 w-12 rounded-full' : 'h-12 w-20 rounded-md2'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </Field>
  );
}

// 園所識別：名稱 + 色彩 + logo + 封面。
// 住在 AppearanceEditor 的底部面板裡，所以是單欄的一疊欄位。
// 顏色改動即時套到整個 App（見 AppearanceEditor 的預覽 effect），按下「儲存」才寫回園所資料。
export function BrandSection({ draft, onChange }: BrandSectionProps) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="園所名稱" hint="家長在每一頁的左上角看到的就是它">
        <input
          type="text"
          value={draft.brandName}
          maxLength={60}
          onChange={(e) => onChange({ brandName: e.target.value })}
          className="field"
        />
      </Field>

      <Field label="代表色" hint="主色用在按鈕與重點，副色用在輔助點綴。選了立刻套到整個畫面。" group>
        <div className="flex flex-wrap gap-2">
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
                className={`tappable flex min-h-touch items-center gap-2 rounded-md2 border px-3 text-sm font-semibold transition ${
                  active
                    ? 'border-brand-primary bg-brand-wash text-brand-primary'
                    : 'border-line-strong bg-surface text-ink-soft'
                }`}
              >
                <span
                  aria-hidden
                  className="h-5 w-5 rounded-full border border-hairline"
                  style={{ background: preset.primary }}
                />
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="主色">
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={draft.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                aria-label="主色"
                className="h-11 w-12 shrink-0 cursor-pointer rounded-md2 border border-line-strong bg-surface"
              />
              <span className="text-sm tabular-nums text-ink">{draft.primaryColor}</span>
            </span>
          </Field>
          <Field label="副色">
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={draft.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                aria-label="副色"
                className="h-11 w-12 shrink-0 cursor-pointer rounded-md2 border border-line-strong bg-surface"
              />
              <span className="text-sm tabular-nums text-ink">{draft.secondaryColor}</span>
            </span>
          </Field>
        </div>
      </Field>

      <ImageField
        kind="logo"
        label="園徽 / Logo"
        hint="顯示在每一頁的左上角，建議正方形。"
        presets={LOGO_PRESETS}
        value={draft.logoUrl}
        round
        onChange={(logoUrl) => onChange({ logoUrl })}
      />

      <ImageField
        kind="banner"
        label="首頁封面"
        hint="家長首頁最上面那張圖，建議橫幅比例；留空就不顯示。"
        presets={BANNER_PRESETS}
        value={draft.bannerUrl}
        round={false}
        onChange={(bannerUrl) => onChange({ bannerUrl })}
      />
    </div>
  );
}
