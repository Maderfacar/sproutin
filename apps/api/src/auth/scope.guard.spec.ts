import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeGuard } from './scope.guard';
import { ScopeResolver } from './scope-resolver.service';
import type { ScopeMeta } from './scope.decorator';
import { AuditEnqueuer } from '../core/audit/audit-enqueuer.service';

function ctxWith(params: Record<string, string>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-teacher', roles: [{ role: 'TEACHER', scopeType: 'CLASS', scopeId: 'c' }] },
        params,
        method: 'GET',
        url: `/students/${params.id ?? ''}`,
      }),
    }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(value: ScopeMeta | undefined): Reflector {
  return { getAllAndOverride: () => value } as unknown as Reflector;
}

function resolverReturning(allowed: boolean): { resolver: ScopeResolver; spy: jest.Mock } {
  const spy = jest.fn(async () => allowed);
  const resolver = { canAccessStudent: spy } as unknown as ScopeResolver;
  return { resolver, spy };
}

function enqueuerSpy(): { enqueuer: AuditEnqueuer; spy: jest.Mock } {
  const spy = jest.fn(async () => undefined);
  const enqueuer = { enqueue: spy } as unknown as AuditEnqueuer;
  return { enqueuer, spy };
}

describe('ScopeGuard', () => {
  it('未宣告 @Scope → allow（不呼叫 resolver）', async () => {
    const { resolver, spy } = resolverReturning(true);
    const guard = new ScopeGuard(reflectorReturning(undefined), resolver, enqueuerSpy().enqueuer);
    await expect(guard.canActivate(ctxWith({ id: 'stu-1' }))).resolves.toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('resolver allow → true，並以 param id 呼叫（不記 DENIED）', async () => {
    const { resolver, spy } = resolverReturning(true);
    const { enqueuer, spy: auditSpy } = enqueuerSpy();
    const guard = new ScopeGuard(
      reflectorReturning({ resource: 'student', param: 'id' }),
      resolver,
      enqueuer,
    );
    await expect(guard.canActivate(ctxWith({ id: 'stu-sun-1' }))).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith('u-teacher', expect.any(Array), 'stu-sun-1');
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it('resolver deny → 403 out_of_scope + enqueue DENIED 稽核', async () => {
    const { resolver } = resolverReturning(false);
    const { enqueuer, spy: auditSpy } = enqueuerSpy();
    const guard = new ScopeGuard(
      reflectorReturning({ resource: 'student', param: 'id' }),
      resolver,
      enqueuer,
    );
    await expect(guard.canActivate(ctxWith({ id: 'stu-other' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(auditSpy).toHaveBeenCalledTimes(1);
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'u-teacher',
        resourceType: 'students',
        resourceId: 'stu-other',
        result: 'DENIED',
        metadata: expect.objectContaining({ reason: 'out_of_scope' }),
      }),
    );
  });
});
