import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPE_KEY, ScopeMeta } from './scope.decorator';
import type { AuthedRequest } from './jwt-auth.guard';
import { ScopeResolver } from './scope-resolver.service';

// request 帶 params（express）；擴充 AuthedRequest 供 scope 解析取資源 id。
interface ScopedRequest extends AuthedRequest {
  params: Record<string, string>;
}

// 資料列級授權 guard（docs/05 §4）。需在 JwtAuthGuard（+RolesGuard）之後。
// 未宣告 @Scope → 略過（僅角色層把關）。
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolver: ScopeResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<ScopeMeta | undefined>(SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!meta) {
      return true;
    }

    const req = context.switchToHttp().getRequest<ScopedRequest>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('unauthenticated');
    }

    const resourceId = req.params[meta.param];
    if (!resourceId) {
      throw new ForbiddenException('missing_resource_id');
    }

    const allowed =
      meta.resource === 'student'
        ? await this.resolver.canAccessStudent(user.id, user.roles, resourceId)
        : false;

    if (!allowed) {
      // 註：DENIED 的 out-of-band audit 於 Phase 7（ADR-005）補上。
      throw new ForbiddenException('out_of_scope');
    }
    return true;
  }
}
