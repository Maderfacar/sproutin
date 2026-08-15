'use client';

import { selectDashboardCards } from '@sproutin/shared';
import { useSession } from '../../lib/session';
import { usePublicConfig } from '../../lib/queries';
import { DashboardCard } from '../../components/DashboardCard';
import { cardMeta } from '../../features/dashboard/cards';

// 卡片式 Dashboard（config-driven）。可見卡片 = selectDashboardCards（角色聯集 + featureFlags + cardOrder）；
// 授權仍在後端 Guard（Rule 5/6），卡片只是入口顯示。
export default function DashboardPage() {
  const { user } = useSession();
  const { data: config } = usePublicConfig();

  const roles = user.roles.map((r) => r.role);
  const cards = selectDashboardCards(roles, config?.featureFlags ?? {}, config?.cardOrder ?? []);

  return (
    <div>
      <section className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">歡迎，{user.displayName}</h1>
        <p className="text-sm text-gray-500">
          {roles.length > 0 ? roles.join('、') : '尚未指派角色'}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const meta = cardMeta(card.id);
          return (
            <DashboardCard
              key={card.id}
              title={meta.title}
              description={meta.description}
              icon={meta.icon}
              href={meta.href}
              enabled={meta.enabled}
            />
          );
        })}
      </div>
    </div>
  );
}
