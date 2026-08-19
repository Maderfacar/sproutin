import type { AuthUser } from '@sproutin/shared';
import { roleFlags } from './roles';

// 身分（persona）＝「看事情的形狀」，不是職稱。
//
// 這是全站改版最上層的一刀（Human Owner 2026-08-20）：舊版把老師要做的事和家長要看的事
// 疊在同一頁，靠小標籤區分 —— 於是每個人都得先讀一遍才知道哪一段是自己的。
// 改成一次只給一種身分的殼：頁籤、首頁、問的問題全部不同。
//
// - parent  家長：一個孩子、今天怎麼樣。看的是結果。
// - teacher 班導師：一個班、幾十個孩子、今天還有什麼沒做。做的是重複動作。
// - staff   園長／行政：全園的數字與名單。管的是整體與設定。
// - bus     隨車老師：一條路線的點名。做完就關掉，**不給完整的殼**
//           —— 給他四個頁籤反而是負擔。
export type Persona = 'parent' | 'teacher' | 'staff' | 'bus';

export const PERSONA_LABEL: Record<Persona, string> = {
  parent: '家長',
  teacher: '老師',
  staff: '園長',
  bus: '隨車老師',
};

// 切換時給的一句話，講清楚切過去會看到什麼。只有多重身分的人看得到。
export const PERSONA_HINT: Record<Persona, string> = {
  parent: '我家孩子今天怎麼樣',
  teacher: '我這一班今天還有什麼沒做',
  staff: '全園的數字與名單',
  bus: '我這條路線的點名',
};

// 排在前面的是「上班時會用的」。同時是老師又是家長的人，白天打開 App
// 多半是要做老師的事 —— 預設給工作身分，家長身分讓他自己切。
const PRIORITY: readonly Persona[] = ['staff', 'teacher', 'bus', 'parent'];

// 這個人可以切換到哪些身分。多角色取聯集（一人可兼園長/老師/家長）。
//
// 注意 staff 與 teacher 是分開的：園長兼導師的人兩個都會有，因為那真的是兩件事
// —— 「全園今天到幾個」和「我這班誰還沒點名」不能塞進同一個首頁。
export function availablePersonas(roles: AuthUser['roles']): Persona[] {
  const names = new Set(roles.map((r) => r.role));
  const flags = roleFlags(roles);
  const found: Persona[] = [];
  if (names.has('OWNER') || names.has('ADMIN')) found.push('staff');
  if (names.has('TEACHER')) found.push('teacher');
  // 隨車老師只在「沒有其他校方身分」時才單獨成立。園長兼隨車的人不需要一個
  // 只能點名的殼，他在自己的殼裡就點得到。
  if (names.has('BUS_TEACHER') && found.length === 0) found.push('bus');
  if (flags.isGuardian) found.push('parent');
  return PRIORITY.filter((p) => found.includes(p));
}

// 沒有選過時要落在哪一個。清單已依 PRIORITY 排好，取第一個即可。
// 完全沒有身分的帳號（理論上不該存在，但 seed 或停用中的帳號可能出現）給 parent
// —— 那是唯一不會顯示任何管理功能的殼，最安全。
export function defaultPersona(available: readonly Persona[]): Persona {
  return available[0] ?? 'parent';
}

// 記住的身分還算不算數。角色被拔掉之後，上次選的那個身分必須失效，
// 否則使用者會停在一個點什麼都 403 的殼裡。
export function resolvePersona(
  available: readonly Persona[],
  remembered: string | null | undefined,
): Persona {
  if (remembered && isPersona(remembered) && available.includes(remembered)) {
    return remembered;
  }
  return defaultPersona(available);
}

export function isPersona(value: string): value is Persona {
  return value === 'parent' || value === 'teacher' || value === 'staff' || value === 'bus';
}
