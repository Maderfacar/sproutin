'use client';

import { selectDashboardCards } from '@sproutin/shared';
import { useSession } from '../../lib/session';
import { usePublicConfig } from '../../lib/queries';
import { DashboardCard } from '../../components/DashboardCard';
import { cardMeta } from '../../features/dashboard/cards';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return '早安';
  if (h < 18) return '午安';
  return '晚安';
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: '園長',
  ADMIN: '行政',
  TEACHER: '老師',
  BUS_TEACHER: '隨車老師',
  PARENT: '家長',
  GUARDIAN: '監護人',
};

// 卡片式 Dashboard（config-driven）。可見卡片 = selectDashboardCards（角色聯集 + featureFlags + cardOrder）;
// 授權仍在後端 Guard，卡片只是入口。
export default function DashboardPage() {
  const { user } = useSession();
  const { data: config } = usePublicConfig();

  const roles = user.roles.map((r) => r.role);
  const cards = selectDashboardCards(roles, config?.featureFlags ?? {}, config?.cardOrder ?? []);
  const roleLabels = [...new Set(roles.map((r) => ROLE_LABEL[r] ?? r))];

  return (
    <div>
      <section className="rise-in mb-7">
        <p className="text-sm font-semibold text-brand-primary">{greeting()} 👋</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{user.displayName}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {roleLabels.length > 0 ? (
            roleLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-soft shadow-soft"
              >
                {label}
              </span>
            ))
          ) : (
            <span className="text-xs text-ink-soft">尚未指派角色</span>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3.5">
        {cards.map((card, i) => {
          const meta = cardMeta(card.id);
          return (
            <DashboardCard
              key={card.id}
              title={meta.title}
              description={meta.description}
              icon={meta.icon}
              href={meta.href}
              enabled={meta.enabled}
              delay={0.04 * i}
            />
          );
        })}
      </div>
    </div>
  );
}
