import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import { TONE, type Tone } from './tone';
import { Badge } from './Badge';

// 待辦磚塊。導師與行政首頁的主體。
//
// 一塊＝今天要做的一件事：圖示、這是什麼、還剩多少、右邊一顆數字。
// 取代舊版首頁那種「六張一樣大的功能卡」——那種排法把「今天有 3 人沒點名」和
// 「稽核紀錄」講成同樣份量，眼睛沒有落點，只能整片掃過去讀。
//
// 做完的事不要留在原位變灰：收到下面的「已完成」區，或直接消失。
// 首頁的價值在於**它會變短**，不在於它很完整。

interface TileProps {
  icon: IconName;
  title: string;
  /** 一句話講還差什麼。例：「還有 3 人沒點」 */
  detail?: string;
  /** 還有幾件事等你。0 或未給就不畫徽章。 */
  count?: number;
  /** 圖示底色。用狀態色分辨這件事的性質，不是為了好看。 */
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  /** 右邊自訂內容。給了就取代 count 徽章。 */
  trailing?: ReactNode;
}

export function Tile({
  icon,
  title,
  detail,
  count,
  tone = 'brand',
  href,
  onClick,
  trailing,
}: TileProps) {
  const inner = (
    <>
      <span
        aria-hidden
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md2 ${TONE[tone].block}`}
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-lg font-bold text-ink">{title}</span>
        {detail && <span className="mt-0.5 block truncate text-2xs text-ink-soft">{detail}</span>}
      </span>
      {trailing ?? (count !== undefined && count > 0 ? <Badge tone="stop" count>{count}</Badge> : null)}
    </>
  );

  const shape =
    'tappable flex min-h-touch w-full items-center gap-3.5 rounded-tile border border-line-strong bg-surface p-4 shadow-soft';

  if (href) {
    return (
      <Link href={href} className={shape}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={shape}>
      {inner}
    </button>
  );
}
