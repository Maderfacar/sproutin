'use client';

import Link from 'next/link';
import { useBranding } from '../lib/branding';

// 網站根路徑。任何人（含搜尋引擎、隨手貼網址的人）都會看到這一頁，
// 因此**不顯示任何系統內部資訊** —— 這裡原本是 Phase 5 驗證 runtime config 管線的骨架頁，
// 直接把整包設定（功能開關、卡片順序、liffId…）印在畫面上。那些值依 ADR-001 本就非機密，
// 但把系統的內部結構攤給不特定人看沒有任何好處，對要拿去賣的產品更是難看。
//
// 這一頁只回答「我該從哪裡進去」：家長從 LINE 進、園所人員用電腦進。
export default function Home() {
  const branding = useBranding();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="card w-full max-w-md p-8 text-center">
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logoUrl}
            alt={branding.brandName}
            className="mx-auto h-14 w-14 rounded-full border border-brand-primary/40 bg-surface object-contain"
          />
        ) : (
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] text-xl font-bold"
            style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
          >
            {branding.brandName.charAt(0)}
          </span>
        )}

        <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight text-ink">
          {branding.brandName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          園所與家長的每日聯繫。請從下面選擇你要進入的方式。
        </p>

        <div className="mt-7 space-y-3 text-left">
          <div className="rounded-md2 border border-line p-4">
            <p className="text-sm font-semibold text-ink">家長</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              請用手機開啟園所的 LINE 官方帳號，點下方的選單進入。
              家長端只能從 LINE 進入，不需要另外記帳號密碼。
            </p>
          </div>

          <Link
            href="/admin/login"
            className="block rounded-md2 border border-line p-4 transition hover:border-brand-primary"
          >
            <p className="text-sm font-semibold text-brand-primary">園所人員</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              用電腦進入園務後台（以 LINE 登入）。
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
