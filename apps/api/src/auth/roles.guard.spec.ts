import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '@sproutin/shared';
import { RolesGuard } from './roles.guard';

function ctxWith(roles: AuthUser['roles']): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u', roles } }) }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(value: unknown): Reflector {
  return { getAllAndOverride: () => value } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('未宣告 @Roles → allow', () => {
    const guard = new RolesGuard(reflectorReturning(undefined));
    expect(guard.canActivate(ctxWith([]))).toBe(true);
  });

  it('具備所需角色之一 → allow', () => {
    const guard = new RolesGuard(reflectorReturning(['TEACHER', 'ADMIN']));
    expect(
      guard.canActivate(ctxWith([{ role: 'TEACHER', scopeType: 'CLASS', scopeId: 'c' }])),
    ).toBe(true);
  });

  it('缺所需角色 → 403', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN']));
    expect(() =>
      guard.canActivate(ctxWith([{ role: 'PARENT', scopeType: 'SCHOOL', scopeId: null }])),
    ).toThrow(ForbiddenException);
  });
});
