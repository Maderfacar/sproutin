'use client';

import { notFound, useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/PageHeader';
import { Icon } from '../../../../components/Icon';
import { cardMeta } from '../../../../features/dashboard/cards';
import { roadmapEntry } from '../../../../features/roadmap/roadmap';

// 功能預告頁：尚未完工的功能不是死角，而是看得到的下一步。
// 內容來自 features/roadmap/roadmap.ts;圖示沿用該功能卡片的圖示。
export default function SoonPage() {
  const params = useParams<{ feature: string }>();
  const featureId = params.feature;
  const entry = roadmapEntry(featureId);

  if (!entry) {
    notFound();
  }

  const meta = cardMeta(featureId);

  return (
    <div className="space-y-7">
      <PageHeader title={entry.title} />

      <section className="rise-in card p-6">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'color-mix(in srgb, var(--brand-primary) 12%, var(--surface))',
              color: 'var(--brand-primary)',
            }}
          >
            <Icon name={meta.icon} className="h-6 w-6" />
          </span>
          <span className="chip border border-line text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Icon name="sparkle" className="h-3 w-3" />
              開發中
            </span>
          </span>
        </div>
        <p className="mt-4 font-serif text-lg leading-relaxed text-ink">{entry.tagline}</p>
      </section>

      <section className="rise-in" style={{ animationDelay: '0.05s' }}>
        <p className="eyebrow mb-2">家長會看到</p>
        <ul className="border-t border-line">
          {entry.forFamily.map((item) => (
            <li key={item} className="flex gap-3 border-b border-line py-3">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
              <span className="text-sm leading-relaxed text-ink">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rise-in" style={{ animationDelay: '0.1s' }}>
        <p className="eyebrow mb-2">園所會得到</p>
        <ul className="border-t border-line">
          {entry.forSchool.map((item) => (
            <li key={item} className="flex gap-3 border-b border-line py-3">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
              <span className="text-sm leading-relaxed text-ink">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs leading-relaxed text-ink-soft">
        這項功能尚未開放使用。
        <br />
        園所可在「園所外觀」中決定是否向家長預告。
      </p>
    </div>
  );
}
