import type { ReactNode } from 'react';

// 清單列。全站的名單一律長這樣：頭像 → 名字（+ 一行說明）→ 右邊一顆狀態或動作。
//
// 高度至少 44px（min-h-touch）。整列要能點時由呼叫端包 button 或 Link
// —— 因為「可以點」的元素該是哪一種由頁面決定，包死在這裡反而所有人都要繞過它。

interface AvatarProps {
  /** 通常傳名字，取第一個字。 */
  name: string;
}

export function Avatar({ name }: AvatarProps) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-wash text-sm font-bold text-brand-primary"
    >
      {name.charAt(0)}
    </span>
  );
}

interface RowProps {
  /** 左邊的頭像或圖示。 */
  lead?: ReactNode;
  title: ReactNode;
  /** 一行說明。沒有就不畫，不要硬湊。 */
  detail?: ReactNode;
  /** 右邊的狀態徽章或箭頭。 */
  trailing?: ReactNode;
}

export function Row({ lead, title, detail, trailing }: RowProps) {
  return (
    <div className="flex min-h-touch w-full items-center gap-3 border-b border-line px-1 py-3 last:border-b-0">
      {lead}
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-base font-medium text-ink">{title}</p>
        {detail && <p className="mt-0.5 truncate text-2xs text-ink-soft">{detail}</p>}
      </div>
      {trailing}
    </div>
  );
}
