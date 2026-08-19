import Link from 'next/link';
import { StaticDocumentTitle } from '../components/DocumentTitle';
import { Button } from '../components/ui';

// 找不到頁面（Next.js 會用這一頁接住所有對不上的網址）。
//
// **不套園所品牌**：這一頁只掛在 RootLayout 底下，不在 /admin 或 /liff 的 layout 之內，
// 所以拿不到 BrandingProvider（跟根路徑 app/page.tsx 是同一個限制）。
// 清葉的底色、字體、細線都寫在 globals.css 的 :root，不靠 provider 也長得對。
//
// 一定要給得出下一步 —— 打錯網址的人通常不知道自己打錯在哪，
// 丟一個「找不到」讓他自己想辦法就等於把人擋在門外。
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <StaticDocumentTitle title="找不到頁面 · Sproutin" />
      <div className="rounded-tile border border-line-strong bg-surface shadow-soft w-full max-w-md p-8 text-center">
        <span className="text-4xl" aria-hidden>
          🌱
        </span>
        <h1 className="mt-4 font-serif text-2xl font-semibold tracking-tight text-ink">
          找不到這個頁面
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          網址可能改過、打錯了，或這個頁面已經不在了。從下面回到入口再進去就好。
        </p>

        <div className="mt-7">
          <Button href="/" variant="primary">
            回到首頁
          </Button>
        </div>

        <p className="mt-4 text-xs text-ink-soft">
          園所人員可以直接前往
          <Link href="/admin" className="ml-1 text-brand-primary underline underline-offset-4">
            園務後台
          </Link>
          。家長請從園所的 LINE 選單進入。
        </p>
      </div>
    </main>
  );
}
