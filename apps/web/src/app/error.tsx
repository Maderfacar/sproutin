'use client';

import Link from 'next/link';
import { StaticDocumentTitle } from '../components/DocumentTitle';
import { Button } from '../components/ui';

// 程式在瀏覽器裡出錯時接住的頁面（Next.js 會用這一頁取代整段畫面）。
//
// 沒有這一頁的話，出錯時跳出來的是 Next.js 的英文預設錯誤頁 —— 對家長是天書，
// demo 現場撞到更難看。這一頁要做到三件事：
//   ① 用人話說「出狀況的是我們，不是你」；
//   ② 給得出下一步（先重試，不行就回入口）—— 大多數是暫時性的網路或載入問題；
//   ③ 留一個可以拿來回報的代碼，但**不顯示技術細節**（錯誤訊息可能含內部結構）。
//
// **不套園所品牌**：這一頁可能在 BrandingProvider 掛上去之前就被觸發（例如載入設定時就爆了），
// 硬要讀 provider 會在這裡再爆一次。清葉的底色與字體寫在 globals.css 的 :root，不靠 provider。
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <StaticDocumentTitle title="出了點狀況 · Sproutin" />
      <div className="rounded-tile border border-line-strong bg-surface shadow-soft w-full max-w-md p-8 text-center">
        <span className="text-4xl" aria-hidden>
          🍃
        </span>
        <h1 className="mt-4 font-serif text-2xl font-semibold tracking-tight text-ink">
          這一頁出了點狀況
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          是我們這邊的問題，不是你操作錯了。多半是一時的連線或載入問題，先試一次重新載入。
        </p>

        <div className="mt-7">
          <Button variant="primary" onClick={reset}>
            重新載入這一頁
          </Button>
        </div>

        <p className="mt-4 text-xs text-ink-soft">
          還是不行的話，
          <Link href="/" className="mx-1 text-brand-primary underline underline-offset-4">
            回到入口
          </Link>
          再進來一次。
        </p>

        {/* 回報用的代碼。不印錯誤訊息本身 —— 那可能含內部結構，對使用者也沒有意義。 */}
        {error.digest && (
          <p className="mt-5 border-t border-line pt-4 text-2xs tabular-nums text-ink-soft">
            回報時請附上這組代碼：{error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
