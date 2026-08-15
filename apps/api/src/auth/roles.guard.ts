import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@sproutin/shared';
import { ROLES_KEY } from './roles.decorator';
import type { AuthedRequest } from './jwt-auth.guard';
import { AuditEnqueuer } from '../core/audit/audit-enqueuer.service';
import { buildDeniedAuditEntry, AuditRequestLike } from '../core/audit/audit.util';

// 粗粒度授權：呼叫者是否具備端點要求的任一角色（docs/05 §2、Rule 5/6）。
// 需在 JwtAuthGuard 之後執行（req.user 已存在）。
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly enqueuer: AuditEnqueuer,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未宣告 @Roles → 不做角色限制。
    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const userRoles = req.user?.roles ?? [];
    const has = userRoles.some((r) => required.includes(r.role));

    if (!has) {
      // DENIED out-of-band audit（ADR-005 類別二）;fire-and-forget，永不阻塞拒絕回應。
      void this.enqueuer.enqueue(
        buildDeniedAuditEntry(req as unknown as AuditRequestLike, 'insufficient_role'),
      );
      throw new ForbiddenException('insufficient_role');
    }
    return true;
  }
}
