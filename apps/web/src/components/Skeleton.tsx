// 骨架屏（Human Owner 2026-08-18 定案：B1 前三件之一）。
//
// 取代「載入中…」那一行字。原生 app 的「快」有一半來自它在等的時候就先把版面畫出來
// —— 你知道等一下會出現什麼，感覺就不像在等；一行灰字則是把人丟在空白裡。
//
// 形狀要**像等一下真的會出現的東西**，否則資料一到會整頁跳動。
// 動畫尊重 prefers-reduced-motion（在 globals.css 裡關掉，與 .rise-in 同一個慣例）。

interface SkeletonProps {
  className?: string;
  /** 寬度百分比。留白不整齊反而更像真的文字。 */
  width?: string;
}

export function Skeleton({ className = '', width }: SkeletonProps) {
  return <span className={`skeleton block ${className}`} style={width ? { width } : undefined} />;
}

/** 幾行長短不一的文字。用在段落、說明、單一區塊。 */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const widths = ['92%', '78%', '85%', '64%', '88%'];
  return (
    <div aria-hidden className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3.5 rounded-md2" width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/** 清單：左邊一顆圓、右邊兩行。用在通知、公告、請假紀錄、學生名單。 */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  const widths = ['70%', '55%', '82%', '48%', '66%'];
  return (
    <ul aria-hidden className="border-t border-line">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-start gap-3 border-b border-line px-1 py-3.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 rounded-md2" width={widths[i % widths.length]} />
            <Skeleton className="h-3 rounded-md2" width="38%" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 卡片：標籤 + 大字 + 一行說明。用在今日狀態、統計、設定區塊。 */
export function SkeletonCards({ cards = 2 }: { cards?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="rounded-tile border border-line-strong bg-surface p-5 shadow-soft">
          <Skeleton className="h-2.5 rounded-md2" width="24%" />
          <Skeleton className="mt-3 h-5 rounded-md2" width="58%" />
          <Skeleton className="mt-2 h-3 rounded-md2" width="40%" />
        </div>
      ))}
    </div>
  );
}
