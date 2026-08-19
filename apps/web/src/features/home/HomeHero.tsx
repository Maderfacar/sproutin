'use client';

import { useBranding } from '../../lib/branding';

interface HomeHeroProps {
  greeting: string;
  displayName: string;
  dateLabel: string;
  /**
   * 問候底下那一行。**多重身分的人一定要傳**（例：「王小明 的家長」）——
   * 園長切到家長身分之後，hero 只寫他自己的名字，讀起來像還在跟園長打招呼
   * （Human Owner 2026-08-20 回報）。寫出是「誰的家長」才看得出自己站在哪一邊。
   * 沒傳就退回園所名稱。
   */
  context?: string;
}

// 首頁 hero：園所的門面只講一次、講得夠大（Human Owner 決策 2026-08-17）。
// 有封面圖 → 大圖 + 由下往上的漸層讓白字站得住;沒有封面圖 → 退回品牌色的雅致色塊，
// 版面高度與層次維持一致，園所還沒上傳圖也不會看起來像壞掉。
//
// 圖往上延伸到頁首後面（Human Owner 2026-08-18）：負的 margin 與補回來的高度都寫在
// globals.css 的 .home-hero / .home-hero-media，靠 --shell-header-h 對齊 PersonaShell（唯一的量測值來源）。
export function HomeHero({ greeting, displayName, dateLabel, context }: HomeHeroProps) {
  const branding = useBranding();
  const hasImage = Boolean(branding.bannerUrl);

  return (
    <section className="rise-in home-hero -mx-5 mb-1">
      <div className="home-hero-media relative overflow-hidden">
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

        {/* 頂端的暗紗：頁首的白字現在疊在這張圖（或品牌色塊）上，而封面圖是園所自己上傳的，
            可能是一張上半部很亮的照片;品牌色也可能挑到淺色。這條紗保證園名一定讀得到。 */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: 'calc(var(--shell-header-h) + 2.5rem)',
            background: 'linear-gradient(to bottom, rgba(20,28,24,0.45) 0%, rgba(20,28,24,0) 100%)',
          }}
        />

        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className="text-2xs font-bold uppercase tracking-[0.16em] text-white/70">{dateLabel}</p>
          <h1 className="mt-1.5 font-serif text-3xl font-semibold leading-tight tracking-tight text-white">
            {greeting}，{displayName}
          </h1>
          <p className="mt-1 text-sm text-white/80">{context ?? branding.brandName}</p>
        </div>
      </div>
    </section>
  );
}
