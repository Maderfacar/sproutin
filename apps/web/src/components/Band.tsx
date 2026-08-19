'use client';

import type { ReactNode } from 'react';
import { SectionHead } from './ui/SectionHead';

// 版面的斷句。**改版後這裡只剩一層薄殼，真正的東西在 components/ui/SectionHead。**
//
// Band 原本做兩件事：用線的粗細分輕重（有效），以及在每一段貼上
// 「要做的事／查看／管理」與「以老師身分」的分類籤（失敗）。
//
// 後者是這次全站改版的直接起因（Human Owner 2026-08-20）：
// **介面需要貼標籤解釋自己，就是版面已經失敗了。** 身分改由整個殼區分
// （見 components/shell），一次只給一種身分，標籤就沒有存在的必要。
//
// 保留這個元件名字是為了不必一次改十五個呼叫端；`audience` 已無作用，
// 第四批把各面板逐頁重做完之後整個檔案會刪掉。

export type BandKind = 'action' | 'review' | 'manage';
export type BandAudience = 'staff' | 'parent';

interface BandProps {
  kind: BandKind;
  title: string;
  /** 一句話講現在的狀態或下一步。沒有就不畫，不要硬湊。 */
  description?: string;
  /** @deprecated 身分改由整個殼區分，這個屬性已無作用。 */
  audience?: BandAudience;
  children: ReactNode;
}

export function Band({ kind, title, description, children }: BandProps) {
  return (
    <section className="mb-7 last:mb-0">
      <SectionHead
        title={title}
        description={description}
        weight={kind === 'review' ? 'review' : 'action'}
      />
      {/* 查閱區的卡片收斂一階，不跟上面的動作區搶注意力。 */}
      <div className={kind === 'review' ? '[&_.card]:shadow-none' : ''}>{children}</div>
    </section>
  );
}
