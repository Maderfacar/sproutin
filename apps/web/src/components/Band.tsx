'use client';

import type { ReactNode } from 'react';
import { useSession } from '../lib/session';
import { roleFlags } from '../lib/roles';

// 版面的「標點符號」（Human Owner 2026-08-18 打磨第二階段定案）。
//
// 症狀：一頁把好幾個功能區塊用同樣的間距、同樣份量的卡片一路疊下來，像一篇沒有
// 標點的文章 —— 眼睛找不到落點。而且多重身分的人（既帶班、小孩也在園裡）看不出
// 哪一段是「我要做的事」、哪一段是「我孩子的狀況」。
//
// 這個元件把兩件事一起解決：
//   1. 每一段都有「類別 + 標題 + 一句說明」，段與段之間有真正的分界線。
//   2. 「要動手做的事」比「翻閱查詢」重 —— 今天該做什麼永遠排在視覺前面。
//   3. 需要時標出這一段是以什麼身分在看，**但只給多重身分的人看**。
//
// 桌面版仍由 components/SplitColumns 左右分欄（那本來就是同一套分法的寬螢幕版本）;
// 這個元件把同樣的分法帶到手機上，兩邊講的是同一件事。

export type BandKind = 'action' | 'review' | 'manage';
export type BandAudience = 'staff' | 'parent';

const KIND_LABEL: Record<BandKind, string> = {
  action: '要做的事',
  review: '查看',
  manage: '管理',
};

const AUDIENCE_LABEL: Record<BandAudience, string> = {
  staff: '以老師身分',
  parent: '以家長身分',
};

const AUDIENCE_CLASS: Record<BandAudience, string> = {
  staff: 'bg-brand-primary/10 text-brand-primary ring-1 ring-inset ring-brand-primary/25',
  parent: 'bg-amber-700/10 text-amber-800 ring-1 ring-inset ring-amber-700/25',
};

interface BandProps {
  kind: BandKind;
  title: string;
  /** 一句話講現在的狀態或下一步。沒有就不畫，不要硬湊。 */
  description?: string;
  /**
   * 這一段是以什麼身分在看。**只有同時是校方又是家長的人才會看到**
   * —— 純家長看到「以家長身分」是廢話，反而變噪音（見 roleFlags.hasDualIdentity）。
   */
  audience?: BandAudience;
  children: ReactNode;
}

export function Band({ kind, title, description, audience, children }: BandProps) {
  const { user } = useSession();
  const showAudience = audience !== undefined && roleFlags(user.roles).hasDualIdentity;

  // 「要動手的」用粗實線收住，「只是查閱的」用細線 —— 份量差別就是斷句本身。
  const isPrimary = kind !== 'review';

  return (
    <section className="mb-7 last:mb-0">
      <div
        className={`mb-3.5 flex items-start gap-3 pb-2.5 ${
          isPrimary ? 'border-b-2 border-ink' : 'border-b border-line'
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{KIND_LABEL[kind]}</p>
          <h2 className="mt-0.5 font-serif text-xl font-semibold leading-tight tracking-tight text-ink">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p>
          )}
        </div>

        {showAudience && (
          <span
            className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-3xs font-bold ${AUDIENCE_CLASS[audience]}`}
          >
            {AUDIENCE_LABEL[audience]}
          </span>
        )}
      </div>

      {/* 查閱區的卡片收斂一階，不跟上面的動作區搶注意力。 */}
      <div className={isPrimary ? '' : '[&_.card]:shadow-none'}>{children}</div>
    </section>
  );
}
