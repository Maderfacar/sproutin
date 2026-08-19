import type { ReactNode } from 'react';
import { TONE, type Tone } from './tone';

// 徽章。兩種，差別是「事實」還是「還有幾件事等你」：
//
// - 狀態徽章（預設）：淡底 + 邊框。到校 / 請假 / 待審核。它在陳述現況，不該搶注意力。
// - 數字徽章（count）：實心。它在催人動手，必須比周圍任何東西都跳。
//
// 數字一律 tabular-nums —— 清單裡上下兩列的「3」和「12」對不齊會看起來很廉價。

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  /** 實心數字徽章。用在「還有 N 件事沒做」。 */
  count?: boolean;
}

export function Badge({ children, tone = 'neutral', count = false }: BadgeProps) {
  const skin = count ? TONE[tone].solid : `border ${TONE[tone].block}`;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold tabular-nums ${skin}`}
    >
      {children}
    </span>
  );
}
