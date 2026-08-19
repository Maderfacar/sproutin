import type { ReactNode } from 'react';

// 頁首。三個殼共用同一條，差別只在左邊放什麼。
//
// 左邊：家長看到園所 logo 與名字（他要的是「這是我孩子的學校」）；
//       校方看到身分鈕（他要的是「我現在以什麼身分在看」）。
// 右邊：日期或通知鈴。
//
// 一律 sticky。手機上頁首捲走之後，使用者會失去「我在哪個 App 的哪一層」的感覺
// —— 那是網頁感的來源之一。

interface AppBarProps {
  /** 左邊。園所識別或身分鈕。 */
  lead: ReactNode;
  /** 右邊的一行小字。通常是日期或範圍（「全園」）。 */
  meta?: string;
  /** 最右邊的動作。通常是通知鈴。 */
  trailing?: ReactNode;
}

export function AppBar({ lead, meta, trailing }: AppBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
        {lead}
        {meta && <span className="ml-auto shrink-0 text-2xs text-ink-soft">{meta}</span>}
        {trailing && <div className={meta ? 'shrink-0' : 'ml-auto shrink-0'}>{trailing}</div>}
      </div>
    </header>
  );
}
