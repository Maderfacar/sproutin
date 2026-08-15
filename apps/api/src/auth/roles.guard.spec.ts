import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '@sproutin/shared';
import { RolesGuard } from './roles.guard';
import { AuditEnqueuer } from '../core/audit/audit-enqueuer.service';

function ctxWith(roles: AuthUser['roles']): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'u', roles }, method: 'GET', url: '/leaves/x', params: {} }),
    }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(value: unknown): Reflector {
  return { getAllAndOverride: () => value } as unknown as Reflector;
}

function enqueuerSpy(): { enqueuer: AuditEnqueuer; spy: jest.Mock } {
  const spy = jest.fn(async () => undefined);
  const enqueuer = { enqueue: spy } as unknown as AuditEnqueuer;
  return { enqueuer, spy };
}

describe('RolesGuard', () => {
  it('未宣告 @Roles → allow', () => {
    const guard = new RolesGuard(reflectorReturning(undefined), enqueuerSpy().enqueuer);
    expect(guard.canActivate(ctxWith([]))).toBe(true);
  });

  it('具備所需角色之一 → allow（不記 DENIED）', () => {
    const { enqueuer, spy } = enqueuerSpy();
    const guard = new RolesGuard(reflectorReturning(['TEACHER', 'ADMIN']), enqueuer);
    expect(
      guard.canActivate(ctxWith([{ role: 'TEACHER', scopeType: 'CLASS', scopeId: 'c' }])),
    ).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('缺所需角色 → 403 + enqueue DENIED 稽核', () => {
    const { enqueuer, spy } = enqueuerSpy();
    const guard = new RolesGuard(reflectorReturning(['ADMIN']), enqueuer);
    expect(() =>
      guard.canActivate(ctxWith([{ role: 'PARENT', scopeType: 'SCHOOL', scopeId: null }])),
    ).toThrow(ForbiddenException);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'u',
        action: 'access.denied',
        result: 'DENIED',
        metadata: expect.objectContaining({ reason: 'insufficient_role' }),
      }),
    );
  });
});
