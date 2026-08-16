import type { Role } from '@sproutin/shared';

// 角色的中文顯示名（全站共用）。
export const ROLE_LABEL: Record<string, string> = {
  OWNER: '園長',
  ADMIN: '行政',
  TEACHER: '老師',
  BUS_TEACHER: '隨車老師',
  PARENT: '家長',
  GUARDIAN: '監護人',
};

// 一組角色 → 給人看的「對象」說明。合併同義身分（家長/監護人、老師/隨車老師）並去重，
// 讓設定頁能一眼看出「這張卡是給誰看的」。
const AUDIENCE_LABEL: Record<string, string> = {
  OWNER: '園長',
  ADMIN: '行政',
  TEACHER: '老師',
  BUS_TEACHER: '老師',
  PARENT: '家長',
  GUARDIAN: '家長',
};

const AUDIENCE_ORDER = ['家長', '老師', '行政', '園長'];

export function audienceLabels(roles: readonly Role[]): string[] {
  const set = new Set(roles.map((r) => AUDIENCE_LABEL[r] ?? r));
  return AUDIENCE_ORDER.filter((label) => set.has(label));
}
