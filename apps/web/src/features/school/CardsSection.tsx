'use client';

import {
  MVP_CARDS,
  cardFlagKey,
  type CardDescriptor,
  type Role,
  type SchoolAdminConfig,
} from '@sproutin/shared';
import { Icon } from '../../components/Icon';
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

function isVisible(card: CardDescriptor, flags: Record<string, boolean>): boolean {
  const flag = flags[cardFlagKey(card)];
  return card.requiredFeature ? flag === true : flag !== false;
}

// 功能卡片：園所自行決定家長頁上出現哪些功能、以什麼順序出現。
// 規劃中的功能打開後會顯示為「即將推出」並連到預告頁 —— 要不要向家長預告，園所自己決定。
export function CardsSection({ draft, onChange, viewerRoles = [] }: CardsSectionProps) {
  const cards = orderedCards(draft.cardOrder);
  const viewerRoleSet = new Set<Role>(viewerRoles);

  const toggle = (card: CardDescriptor): void => {
    const key = cardFlagKey(card);
    onChange({ featureFlags: { ...draft.featureFlags, [key]: !isVisible(card, draft.featureFlags) } });
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
    <section className="rise-in card p-5" style={{ animationDelay: '0.05s' }}>
      <ul className="border-t border-line">
        {cards.map((card, i) => {
          const meta = cardMeta(card.id);
          const visible = isVisible(card, draft.featureFlags);
          const audience = audienceLabels(card.requiredRoles).join(' · ');
          const viewerSees = card.requiredRoles.some((r) => viewerRoleSet.has(r));
          return (
            <li key={card.id} className="flex items-center gap-3 border-b border-line py-3">
              <Icon
                name={meta.icon}
                className={`h-5 w-5 shrink-0 ${visible ? 'text-brand-primary' : 'text-ink-soft'}`}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{meta.title}</p>
                <p className="truncate text-xs text-ink-soft">
                  {meta.enabled ? meta.description : '規劃中 · 顯示為即將推出'}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  給：{audience}
                  {visible && !viewerSees && '（你的身分看不到）'}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`${meta.title} 往上移`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-brand-primary hover:text-brand-primary disabled:opacity-30"
                >
                  <Icon name="chev" className="h-3 w-3 -rotate-90" />
                </button>
                <button
                  type="button"
                  aria-label={`${meta.title} 往下移`}
                  disabled={i === cards.length - 1}
                  onClick={() => move(i, i + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-brand-primary hover:text-brand-primary disabled:opacity-30"
                >
                  <Icon name="chev" className="h-3 w-3 rotate-90" />
                </button>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={visible}
                aria-label={`${meta.title} 顯示於家長頁`}
                onClick={() => toggle(card)}
                className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                  visible ? 'border-transparent' : 'border-line bg-surface'
                }`}
                style={visible ? { background: 'var(--brand-primary)' } : undefined}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-soft transition-all ${
                    visible ? 'left-6' : 'left-0.5 bg-ink-soft'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
