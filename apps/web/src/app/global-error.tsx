'use client';

// 連根版面（RootLayout）本身都壞掉時的最後一道網。
//
// app/error.tsx 是掛在 RootLayout 底下的 —— 如果壞的就是 RootLayout，它接不到，
// 使用者還是會看到 Next.js 的英文預設頁。這一頁會**取代整份文件**，
// 所以必須自己畫 <html> 與 <body>，也不能依賴 globals.css 以外的東西。
//
// 極少數情況才會走到這裡，所以刻意做得很簡單：一句人話 + 一顆重試。
// 樣式寫成 inline —— 這種時候連 CSS 都可能沒載進來。
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-Hant">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f4f2ea',
          color: '#23302a',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', system-ui, sans-serif",
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '24rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>系統暫時無法載入</h1>
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', lineHeight: 1.7, color: '#5c665f' }}>
            是我們這邊的問題。先試一次重新載入；如果一直這樣，請把下面的代碼告訴園所。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.75rem',
              padding: '0.75rem 2rem',
              borderRadius: '999px',
              border: 'none',
              background: '#2f6b4f',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            重新載入
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: '#8a9188' }}>
              代碼：{error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
