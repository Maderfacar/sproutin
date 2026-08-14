import { SetMetadata } from '@nestjs/common';
import type { Role } from '@sproutin/shared';

// @Roles(...)：宣告端點所需的粗粒度角色（docs/05 §2）。
// RolesGuard 讀此 metadata；未標記 = 不做角色限制。
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
