'use client';

import { TEMPLATES, type CampaignTemplate } from './types';

interface CardPreviewProps {
  template: CampaignTemplate;
  brandName: string;
  title: string;
  body: string;
  imageUrl: string | null;
  fields: Record<string, string>;
  buttonLabel: string;
}

// 家長在 LINE 裡會看到的那張卡片。
//
// **這是預覽，不是 LINE 的渲染引擎**：實際字級與間距由 LINE App 決定，這裡只保證
// 「有什麼、沒什麼、順序如何」與送出去的內容一致 —— 園長最需要確認的是那個，
// 而不是像素級的一致。空白欄位在真卡片上不會出現，因此這裡也不顯示。
export function CardPreview({
  template,
  brandName,
  title,
  body,
  imageUrl,
  fields,
  buttonLabel,
}: CardPreviewProps) {
  const spec = TEMPLATES[template];
  const rows = spec.fields
    .map((f) => ({ label: f.label.replace(/（.*）$/, ''), value: (fields[f.key] ?? '').trim() }))
    .filter((r) => r.value.length > 0);

  return (
    <div className="mx-auto w-[248px] overflow-hidden rounded-[22px] border border-line bg-bg shadow-soft">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5">
        <span className="truncate text-xs font-semibold text-ink">{brandName}</span>
      </div>

      <div className="p-3">
        <div className="overflow-hidden rounded-md2 border border-line bg-surface">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-[100px] w-full object-cover" />
          )}
          <div className="space-y-1.5 p-3">
            {spec.badge && (
              <span className="inline-block rounded-md2 bg-black/[0.06] px-2 py-0.5 text-[10px] text-ink-soft">
                {spec.badge}
              </span>
            )}
            <p className="text-[10px] tracking-[0.12em] text-ink-soft">{brandName}</p>
            <p className="text-sm font-semibold leading-snug text-ink">
              {title || '（還沒填標題）'}
            </p>

            {rows.length > 0 && (
              <dl className="space-y-0.5 pt-1">
                {rows.map((r) => (
                  <div key={r.label} className="flex gap-2 text-[11px]">
                    <dt className="w-12 shrink-0 text-ink-soft">{r.label}</dt>
                    <dd className="flex-1 text-ink">{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {body.trim().length > 0 && (
              <p className="whitespace-pre-wrap pt-1 text-[11px] leading-relaxed text-ink-soft">
                {body}
              </p>
            )}
          </div>
          {buttonLabel.trim().length > 0 && (
            <div className="border-t border-line px-3 py-2 text-center text-[11px] text-brand-primary">
              {buttonLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
