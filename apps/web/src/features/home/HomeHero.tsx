'use client';

import { useBranding } from '../../lib/branding';

interface HomeHeroProps {
  greeting: string;
  displayName: string;
  dateLabel: string;
}

// 首頁 hero：園所的門面只講一次、講得夠大（Human Owner 決策 2026-08-17）。
// 有封面圖 → 大圖 + 由下往上的漸層讓白字站得住;沒有封面圖 → 退回品牌色的雅致色塊，
// 版面高度與層次維持一致，園所還沒上傳圖也不會看起來像壞掉。
export function HomeHero({ greeting, displayName, dateLabel }: HomeHeroProps) {
  const branding = useBranding();
  const hasImage = Boolean(branding.bannerUrl);

  return (
    <section className="rise-in -mx-5 -mt-7 mb-1">
      <div className="relative h-56 overflow-hidden sm:h-64">
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={branding.bannerUrl!} alt="" className="h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(20,28,24,0.78) 0%, rgba(20,28,24,0.35) 45%, rgba(20,28,24,0.08) 100%)',
              }}
            />
          </>
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                'linear-gradient(160deg, color-mix(in srgb, var(--brand-primary) 92%, black) 0%, var(--brand-primary) 55%, color-mix(in srgb, var(--brand-secondary) 70%, var(--brand-primary)) 100%)',
            }}
          />
        )}

        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
            {dateLabel}
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-semibold leading-tight tracking-tight text-white">
            {greeting}，{displayName}
          </h1>
          <p className="mt-1 text-sm text-white/80">{branding.brandName}</p>
        </div>
      </div>
    </section>
  );
}
