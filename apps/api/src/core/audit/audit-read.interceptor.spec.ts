import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { AuditReadInterceptor } from './audit-read.interceptor';
import { AuditEnqueuer } from './audit-enqueuer.service';
import type { AuditReadMeta } from './audit-read.decorator';

function reflectorReturning(meta: AuditReadMeta | undefined): Reflector {
  return { getAllAndOverride: () => meta } as unknown as Reflector;
}

function enqueuerSpy(): { enqueuer: AuditEnqueuer; spy: jest.Mock } {
  const spy = jest.fn(async () => undefined);
  return { enqueuer: { enqueue: spy } as unknown as AuditEnqueuer, spy };
}

function ctx(req: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function handlerOf(value: unknown): CallHandler {
  return { handle: () => of(value) } as CallHandler;
}

describe('AuditReadInterceptor', () => {
  it('標了 @AuditRead（param）成功回應 → enqueue READ 稽核（resourceId 取自 param）', async () => {
    const { enqueuer, spy } = enqueuerSpy();
    const interceptor = new AuditReadInterceptor(
      reflectorReturning({ resourceType: 'Student', action: 'student.read', param: 'id' }),
      enqueuer,
    );
    const req = {
      user: { id: 'u', roles: [{ role: 'OWNER' }] },
      params: { id: 'stu-1' },
      method: 'GET',
      originalUrl: '/students/stu-1',
    };
    await firstValueFrom(interceptor.intercept(ctx(req), handlerOf({ id: 'stu-1' })));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'u',
        actorRole: 'OWNER',
        action: 'student.read',
        resourceType: 'Student',
        resourceId: 'stu-1',
        result: 'SUCCESS',
      }),
    );
  });

  it('標了 @AuditRead（query）→ resourceId 取自 query', async () => {
    const { enqueuer, spy } = enqueuerSpy();
    const interceptor = new AuditReadInterceptor(
      reflectorReturning({ resourceType: 'Message', action: 'message.read', query: 'studentId' }),
      enqueuer,
    );
    const req = { user: { id: 'u', roles: [] }, query: { studentId: 'stu-9' }, method: 'GET', url: '/messages?studentId=stu-9' };
    await firstValueFrom(interceptor.intercept(ctx(req), handlerOf([])));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'Message', resourceId: 'stu-9', action: 'message.read' }),
    );
  });

  it('未標記的端點 → 不 enqueue', async () => {
    const { enqueuer, spy } = enqueuerSpy();
    const interceptor = new AuditReadInterceptor(reflectorReturning(undefined), enqueuer);
    const req = { user: { id: 'u', roles: [] }, method: 'GET', url: '/me/students' };
    await firstValueFrom(interceptor.intercept(ctx(req), handlerOf([])));
    expect(spy).not.toHaveBeenCalled();
  });
});
