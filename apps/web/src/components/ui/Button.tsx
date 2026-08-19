'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

// 按鈕。四種份量，用途分得很死：
//
// - primary   整頁只准有一顆。滿版、實心品牌色。「這一頁你要做的那件事」。
// - secondary 線框。同一頁的其他選擇。
// - danger    stop 淡底，**不是實心紅**。實心紅在幼兒園情境太兇，
//             而駁回請假、停用帳號這些事本來就該讓人停一下而不是被嚇到。
// - text      不會改變任何東西的動作（看更多、展開）。
//
// 一律 min-h-touch（44px）+ 按下縮放。按壓回饋不等網路 —— 手指按下當下就要有反應，
// 否則使用者會以為沒按到而再按一次（這是點名重複送出的來源）。

type Variant = 'primary' | 'secondary' | 'danger' | 'text';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-primary text-white shadow-soft hover:opacity-90',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-black/[0.02]',
  danger: 'border border-stop-edge bg-stop-wash text-stop-text hover:opacity-90',
  text: 'text-brand-primary hover:opacity-80',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  /** 滿版。primary 預設滿版（它是這一頁的主角）。 */
  block?: boolean;
}

export function Button({
  children,
  variant = 'secondary',
  block,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const isFull = block ?? variant === 'primary';
  const shape =
    variant === 'text'
      ? 'px-1 py-2 text-left'
      : 'min-h-touch rounded-md2 px-5 py-3 justify-center';
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-2 font-semibold transition duration-fast ease-out-soft active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 ${shape} ${VARIANT[variant]} ${isFull ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
