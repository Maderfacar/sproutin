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

const EVERYONE: Role[] = ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN'];

// 已上線功能（order 10–70）+ 規劃中功能（order 80–130）。
// 規劃中的卡片一律掛 requiredFeature：預設關閉，園所可在「園所外觀」設定頁自行開啟，
// 開啟後於前端顯示為「即將推出」並連到該功能的預告頁（enabled 由 web 的 CARD_META 決定）。
// 這讓每間園所自己決定要不要向家長預告尚未完工的功能（Human Owner 決策 2026-08-17）。
export const MVP_CARDS: readonly CardDescriptor[] = [
  { id: 'announcement', requiredRoles: ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN'], order: 10 },
  { id: 'attendance', requiredRoles: ['OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN'], order: 20 },
  { id: 'leave', requiredRoles: ['OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN'], order: 30 },
  // 聯絡簿＝「一個孩子的頁面」：當日狀態在上、親師對話在下。
  // **原本的「訊息」卡已併入此處**（Human Owner 決策 2026-08-17）：只有一個小孩的家長會覺得
  // 兩張卡點進去幾乎一樣，入口收斂成一張才符合「操作簡單、集成度高」。
  // 訊息 API 與 /liff/message 網址皆保留（舊連結導向聯絡簿），只是不再是獨立入口。
  // ADMIN 保留在此，否則行政人員會失去訊息的閱讀入口（docs/05 矩陣 Message: ADMIN=R）。
  { id: 'communication-book', requiredRoles: ['ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN'], order: 40 },
  {
    id: 'transportation',
    // 園長/行政需看得到娃娃車入口（管理路線與名單）;與 payment/health/portfolio 的對象一致。
    requiredRoles: ['OWNER', 'ADMIN', 'BUS_TEACHER', 'PARENT', 'GUARDIAN'],
    requiredFeature: 'bus',
    order: 60,
  },
  { id: 'audit', requiredRoles: ['OWNER', 'ADMIN'], order: 70 },
  // --- 規劃中（Architecture Reserved，docs/08 §B）---
  { id: 'payment', requiredRoles: ['OWNER', 'ADMIN', 'PARENT', 'GUARDIAN'], requiredFeature: 'payment', order: 80 },
  {
    id: 'portfolio',
    requiredRoles: ['OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN'],
    requiredFeature: 'portfolio',
    order: 90,
  },
  { id: 'forms', requiredRoles: EVERYONE, requiredFeature: 'forms', order: 100 },
  { id: 'calendar', requiredRoles: EVERYONE, requiredFeature: 'calendar', order: 110 },
  {
    id: 'health',
    requiredRoles: ['OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN'],
    requiredFeature: 'health',
    order: 120,
  },
] as const;

const ORDER_FALLBACK = Number.MAX_SAFE_INTEGER;

// 一張卡片在 SchoolConfig.featureFlags 內對應的鍵。
// 規劃中功能用 requiredFeature（與未來 module 的 flag 同名）；已上線功能用卡片 id 本身。
export function cardFlagKey(card: CardDescriptor): string {
  return card.requiredFeature ?? card.id;
}

// 依「使用者角色（多角色取聯集）+ Feature Flag + SchoolConfig.cardOrder」決定並排序 Dashboard 卡片。
// 純函式、前後端可共用；卡片可見性 ≠ 授權（真正授權仍在後端 Guard，見 docs/05）。
// - 角色：使用者只要具備卡片 requiredRoles 之一即可見（一人多角色 → 聯集，docs/05 §5）。
// - Feature Flag（兩種方向）：
//   · 規劃中功能（有 requiredFeature）＝ opt-in：需 featureFlags[feature] === true 才顯示。
//   · 已上線功能＝預設顯示，但園所可明確關閉（featureFlags[cardId] === false 即隱藏）。
//     未設定（undefined）一律視為顯示 → 既有園所零影響。
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
    const flag = featureFlags[cardFlagKey(card)];
    if (card.requiredFeature) return flag === true; // 規劃中功能：opt-in
    return flag !== false; // 已上線功能：預設顯示，可被園所明確關閉
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
