'use client';

import {
  MVP_CARDS,
  cardFlagKey,
  type CardDescriptor,
  type Role,
  type SchoolAdminConfig,
} from '@sproutin/shared';
import { Icon } from '../../components/Icon';
import { TONE } from '../../components/ui';
import { audienceLabels } from '../../lib/roleLabels';
import { cardMeta } from '../dashboard/cards';

type Draft = SchoolAdminConfig;

interface CardsSectionProps {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  /** 目前登入者的角色 —— 用來提示「這張卡你自己的身分看不到」。 */
  viewerRoles?: readonly Role[];
}

// 依 cardOrder 排出目前順序；未列入 cardOrder 者置後並依 CardDescriptor.order（與 selectDashboardCards 同規則）。
function orderedCards(cardOrder: readonly string[]): CardDescriptor[] {
  const index = new Map(cardOrder.map((id, i) => [id, i]));
  const fallback = Number.MAX_SAFE_INTEGER;
  return [...MVP_CARDS].sort((a, b) => {
    const ai = index.get(a.id) ?? fallback;
    const bi = index.get(b.id) ?? fallback;
    return ai !== bi ? ai - bi : a.order - b.order;
  });
}

// 也給 AppearanceEditor 用：入口那一塊要寫「家長首頁顯示幾項」，那個判斷只能有一份。
export function isCardVisible(card: CardDescriptor, flags: Record<string, boolean>): boolean {
  const flag = flags[cardFlagKey(card)];
  return card.requiredFeature ? flag === true : flag !== false;
}

// 功能卡片：園所自行決定家長頁上出現哪些功能、以什麼順序出現。
// 規劃中的功能打開後會顯示為「即將推出」並連到預告頁 —— 要不要向家長預告，園所自己決定。
//
// 一張卡佔兩行（開關在上、排序與觀眾在下）而不是擠成一行：開關與上下移都要 44px 的觸控範圍，
// 硬塞進同一行的結果是三顆按鈕貼在一起，手指按下去常常按錯一顆。
export function CardsSection({ draft, onChange, viewerRoles = [] }: CardsSectionProps) {
  const cards = orderedCards(draft.cardOrder);
  const viewerRoleSet = new Set<Role>(viewerRoles);

  const toggle = (card: CardDescriptor): void => {
    const key = cardFlagKey(card);
    onChange({
      featureFlags: { ...draft.featureFlags, [key]: !isCardVisible(card, draft.featureFlags) },
    });
  };

  const move = (from: number, to: number): void => {
    if (to < 0 || to >= cards.length) return;
    const ids = cards.map((c) => c.id);
    const moved = ids[from];
    if (moved === undefined) return;
    ids.splice(from, 1);
    ids.splice(to, 0, moved);
    onChange({ cardOrder: ids });
  };

  return (
    <ul className="flex flex-col">
      {cards.map((card, i) => {
        const meta = cardMeta(card.id);
        const visible = isCardVisible(card, draft.featureFlags);
        const audience = audienceLabels(card.requiredRoles).join(' · ');
        const viewerSees = card.requiredRoles.some((r) => viewerRoleSet.has(r));
        return (
          <li key={card.id} className="border-b border-line py-3 last:border-b-0">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md2 border ${
                  visible ? TONE.brand.block : TONE.neutral.block
                }`}
              >
                <Icon name={meta.icon} className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-ink">{meta.title}</p>
                <p className="truncate text-2xs text-ink-soft">
                  {meta.enabled ? meta.description : '規劃中 · 顯示為即將推出'}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={visible}
                aria-label={`${meta.title} 顯示於家長頁`}
                onClick={() => toggle(card)}
                className="tappable flex h-11 w-12 shrink-0 items-center justify-center"
              >
                <span
                  className={`relative block h-6 w-11 rounded-full border transition ${
                    visible ? 'border-transparent bg-brand-primary' : 'border-line bg-surface-sunk'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full shadow-soft transition-all ${
                      visible ? 'left-6 bg-white' : 'left-0.5 bg-ink-mute'
                    }`}
                  />
                </span>
              </button>
            </div>

            <div className="mt-1 flex items-center gap-2 pl-14">
              <p className="min-w-0 flex-1 truncate text-2xs text-ink-mute">
                給：{audience}
                {visible && !viewerSees && '（你的身分看不到）'}
              </p>
              <button
                type="button"
                aria-label={`${meta.title} 往上移`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                className="tappable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-soft disabled:opacity-30"
              >
                <Icon name="chev" className="h-4 w-4 -rotate-90" />
              </button>
              <button
                type="button"
                aria-label={`${meta.title} 往下移`}
                disabled={i === cards.length - 1}
                onClick={() => move(i, i + 1)}
                className="tappable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-soft disabled:opacity-30"
              >
                <Icon name="chev" className="h-4 w-4 rotate-90" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
