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
