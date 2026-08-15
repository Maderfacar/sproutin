// Card-based Dashboard descriptor (§25, config-driven)
// 後端依 Role + Feature Flag + SchoolConfig 過濾後回傳；前端只 render (Rule 5/6)。
import type { Role } from './roles.js';

export interface CardDescriptor {
  id: string;
  requiredRoles: Role[];
  requiredFeature?: string; // 對應 SchoolConfig.featureFlags
  requiredPlan?: string; // 未來 subscription plan
  order: number; // 可被 SchoolConfig.cardOrder 覆蓋
}

export const MVP_CARDS: readonly CardDescriptor[] = [
  { id: 'announcement', requiredRoles: ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN'], order: 10 },
  { id: 'attendance', requiredRoles: ['OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN'], order: 20 },
  { id: 'leave', requiredRoles: ['OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN'], order: 30 },
  { id: 'message', requiredRoles: ['ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN'], order: 40 },
  { id: 'communication-book', requiredRoles: ['TEACHER', 'PARENT', 'GUARDIAN'], order: 50 },
  { id: 'transportation', requiredRoles: ['BUS_TEACHER', 'PARENT', 'GUARDIAN'], requiredFeature: 'bus', order: 60 },
] as const;

const ORDER_FALLBACK = Number.MAX_SAFE_INTEGER;

// 依「使用者角色（多角色取聯集）+ Feature Flag + SchoolConfig.cardOrder」決定並排序 Dashboard 卡片。
// 純函式、前後端可共用；卡片可見性 ≠ 授權（真正授權仍在後端 Guard，見 docs/05）。
// - 角色：使用者只要具備卡片 requiredRoles 之一即可見（一人多角色 → 聯集，docs/05 §5）。
// - Feature Flag：卡片若標 requiredFeature，需 featureFlags[feature] === true 才顯示。
// - 排序：cardOrder 內的依其索引排；未列於 cardOrder 者置後，再依 CardDescriptor.order。
export function selectDashboardCards(
  roles: readonly Role[],
  featureFlags: Readonly<Record<string, boolean>> = {},
  cardOrder: readonly string[] = [],
  cards: readonly CardDescriptor[] = MVP_CARDS,
): CardDescriptor[] {
  const roleSet = new Set<Role>(roles);
  const visible = cards.filter((card) => {
    const hasRole = card.requiredRoles.some((r) => roleSet.has(r));
    if (!hasRole) return false;
    if (card.requiredFeature && featureFlags[card.requiredFeature] !== true) return false;
    return true;
  });

  const orderIndex = new Map<string, number>();
  cardOrder.forEach((id, i) => orderIndex.set(id, i));

  return [...visible].sort((a, b) => {
    const ai = orderIndex.has(a.id) ? (orderIndex.get(a.id) as number) : ORDER_FALLBACK;
    const bi = orderIndex.has(b.id) ? (orderIndex.get(b.id) as number) : ORDER_FALLBACK;
    if (ai !== bi) return ai - bi;
    return a.order - b.order;
  });
}
