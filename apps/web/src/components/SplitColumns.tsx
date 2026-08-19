'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { surfaceOf } from '../lib/surface';

interface SplitColumnsProps {
  // 「要動手做的事」（點名、審核、發布）。桌面版放左欄。
  primary: ReactNode;
  // 「查詢與翻閱」。桌面版放右欄。
  secondary: ReactNode;
}

// 每日類頁面在寬螢幕上的兩欄版面。
//
// 這些頁面的內容是共用元件（docs/04 §3b），原本直接沿用手機版的上下排列，
// 於是在 24 吋螢幕上還是一長條，右邊四成完全空著；老師要一邊看待審清單、
// 一邊往下捲去查某個孩子的紀錄。
//
// **由外框決定密度，不由呼叫端傳參數**：AdminShell 與 AppShell 是同一套設計語言的兩種密度
// （見 AdminShell 的說明）。用 surfaceOf(pathname) 判斷現在人在哪一種外框，
// 兩個十行的 page.tsx 就不必各記得傳一個 prop —— 少一個會漏改的地方。
//
// 手機外框一律維持一欄：PersonaShell 的內容區只有 max-w-2xl，硬切兩欄會兩邊都太窄。
// 桌面外框也只在 lg 以上才切 —— 窄視窗時 AdminShell 的導覽已經改成橫向，
// 這時內容區跟手機一樣窄。
//
// 只有一塊內容時（例如家長只看得到「申請請假」）不切欄，避免右半邊開一個空洞。
export function SplitColumns({ primary, secondary }: SplitColumnsProps) {
  const isDesktop = surfaceOf(usePathname()) === 'admin';
  const hasBoth = Boolean(primary) && Boolean(secondary);

  if (!isDesktop || !hasBoth) {
    return (
      <div className="flex flex-col gap-5">
        {primary}
        {secondary}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="flex flex-col gap-5">{primary}</div>
      <div className="flex flex-col gap-5">{secondary}</div>
    </div>
  );
}
