import type { ReactNode } from 'react';

// 分段標題。取代即將退役的 components/Band。
//
// Band 的問題不是做得不好，是它在替版面寫說明文：每一段貼「要做的事／查看／以老師身分」
// 的分類籤 —— 介面需要標籤解釋自己，就是版面已經失敗了（Human Owner 2026-08-20）。
//
// 這裡保留 Band 唯一真正有效的那件事：**用線的粗細分輕重**。
// 粗線＝這一段要動手，細線＝這一段只是看。標題本身講內容（「今天還有 3 件事」），
// 不再講分類。眼睛靠份量找落點，不靠讀標籤。

interface SectionHeadProps {
  /** 上面那行小字。講範圍或時間（「小班 · 李老師」），不是分類。 */
  eyebrow?: string;
  title: string;
  /** 一句話講現況或下一步。沒有就不畫。 */
  description?: string;
  /** 這一段要動手（粗線）還是只是看（細線）。 */
  weight?: 'action' | 'review';
  /** 右邊的動作。例：一顆「全部展開」。 */
  trailing?: ReactNode;
}

export function SectionHead({
  eyebrow,
  title,
  description,
  weight = 'action',
  trailing,
}: SectionHeadProps) {
  const isAction = weight === 'action';
  return (
    <div
      className={`mb-4 flex items-start gap-3 pb-2.5 ${
        isAction ? 'border-b-2 border-ink' : 'border-b border-line'
      }`}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-2xs font-semibold text-ink-mute">{eyebrow}</p>}
        <h2 className="mt-0.5 font-serif text-xl font-bold leading-tight tracking-tight text-ink">
          {title}
        </h2>
        {description && <p className="mt-1 text-2xs leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
