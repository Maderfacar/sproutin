import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeGuard } from './scope.guard';
import { ScopeResolver } from './scope-resolver.service';
import type { ScopeMeta } from './scope.decorator';

function ctxWith(params: Record<string, string>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-teacher', roles: [{ role: 'TEACHER', scopeType: 'CLASS', scopeId: 'c' }] },
        params,
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

describe('ScopeGuard', () => {
  it('未宣告 @Scope → allow（不呼叫 resolver）', async () => {
    const { resolver, spy } = resolverReturning(true);
    const guard = new ScopeGuard(reflectorReturning(undefined), resolver);
    await expect(guard.canActivate(ctxWith({ id: 'stu-1' }))).resolves.toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('resolver allow → true，並以 param id 呼叫', async () => {
    const { resolver, spy } = resolverReturning(true);
    const guard = new ScopeGuard(reflectorReturning({ resource: 'student', param: 'id' }), resolver);
    await expect(guard.canActivate(ctxWith({ id: 'stu-sun-1' }))).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith('u-teacher', expect.any(Array), 'stu-sun-1');
  });

  it('resolver deny → 403 out_of_scope', async () => {
    const { resolver } = resolverReturning(false);
    const guard = new ScopeGuard(reflectorReturning({ resource: 'student', param: 'id' }), resolver);
    await expect(guard.canActivate(ctxWith({ id: 'stu-other' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
