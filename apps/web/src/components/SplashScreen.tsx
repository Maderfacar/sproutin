'use client';

// 開場畫面。**LIFF 冷啟動那 0.5–1 秒不准白屏**（手感規範）。
//
// 那段時間依序在做三件事：取園所設定 → LIFF SDK 初始化 → 換登入憑證。
// 舊版三段都是一顆轉圈圈加一行灰字，於是家長從 LINE 選單點進來看到的第一個畫面
// 是「載入中…」——那是系統在講自己的狀態，不是這間幼兒園在跟他打招呼。
//
// 這裡改成：園所識別（有 logo 就用 logo，沒有就用園名的第一個字）+ 園名 + 一條細進度。
// **底色用品牌色**，所以從 LINE 的深色介面切進來也不會閃一下白。
//
// 進度條刻意是「不知道還要多久」的那種來回跑，不是假裝在讀百分比 ——
// 我們真的不知道 LIFF SDK 要多久。
//
// 第一段（還沒拿到園所設定）拿不到 logo 與園名，退回產品自己的識別。
// 那一段通常只有一兩百毫秒，但沒有它就會閃一下白。

interface SplashScreenProps {
  brandName?: string;
  logoUrl?: string | null;
  /** 現在在等什麼。三段各自不同 —— 卡住時才分得出是卡在哪一段。 */
  message: string;
}

export function SplashScreen({ brandName, logoUrl, message }: SplashScreenProps) {
  const name = brandName ?? 'Sproutin';
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-5 px-8 text-center"
      style={{
        // 用 --brand-base（園所原色）而不是 --brand-primary：這一塊上面壓白字，
        // 深色模式會把 primary 調亮，白字就沒了（與 HomeHero 同一個理由）。
        background:
          'linear-gradient(160deg, color-mix(in srgb, var(--brand-base) 92%, black) 0%, var(--brand-base) 60%, color-mix(in srgb, var(--brand-secondary) 65%, var(--brand-base)) 100%)',
      }}
    >
      <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white/40 bg-white/10">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-serif text-3xl font-bold text-white">{name.charAt(0)}</span>
        )}
      </span>

      <h1 className="font-serif text-2xl font-bold tracking-tight text-white">{name}</h1>

      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-[12rem] flex-col items-center gap-3"
      >
        <span
          aria-hidden
          className="splash-track block h-1 w-full overflow-hidden rounded-full bg-white/20"
        >
          <span className="splash-bar block h-full w-1/3 rounded-full bg-white/80" />
        </span>
        <span className="text-2xs font-semibold text-white/80">{message}</span>
      </div>
    </main>
  );
}
