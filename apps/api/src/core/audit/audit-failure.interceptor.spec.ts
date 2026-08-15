import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { AuditFailureInterceptor } from './audit-failure.interceptor';
import { AuditEnqueuer } from './audit-enqueuer.service';

function enqueuerSpy(): { enqueuer: AuditEnqueuer; spy: jest.Mock } {
  const spy = jest.fn(async () => undefined);
  return { enqueuer: { enqueue: spy } as unknown as AuditEnqueuer, spy };
}

function ctx(method: string, url: string): ExecutionContext {
  const req = { user: { id: 'u', roles: [{ role: 'TEACHER' }] }, method, originalUrl: url, params: {} };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function throwingHandler(err: Error): CallHandler {
  return { handle: () => throwError(() => err) } as CallHandler;
}

describe('AuditFailureInterceptor', () => {
  it('POST + 5xx → enqueue FAILURE 並 rethrow', async () => {
    const { enqueuer, spy } = enqueuerSpy();
    const interceptor = new AuditFailureInterceptor(enqueuer);
    const err = new InternalServerErrorException('boom');
    await expect(
      firstValueFrom(interceptor.intercept(ctx('POST', '/leaves'), throwingHandler(err))),
    ).rejects.toBe(err);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'operation.failure',
        result: 'FAILURE',
        resourceType: 'leaves',
        metadata: expect.objectContaining({ status: 500 }),
      }),
    );
  });

  it('POST + 4xx（業務衝突）→ 不記（rethrow 原例外）', async () => {
    const { enqueuer, spy } = enqueuerSpy();
    const interceptor = new AuditFailureInterceptor(enqueuer);
    const err = new ConflictException('LEAVE_INVALID_TRANSITION');
    await expect(
      firstValueFrom(interceptor.intercept(ctx('PATCH', '/leaves/x/status'), throwingHandler(err))),
    ).rejects.toBe(err);
    expect(spy).not.toHaveBeenCalled();
  });

  it('GET + 5xx → 不記（非狀態變更請求）', async () => {
    const { enqueuer, spy } = enqueuerSpy();
    const interceptor = new AuditFailureInterceptor(enqueuer);
    const err = new InternalServerErrorException('boom');
    await expect(
      firstValueFrom(interceptor.intercept(ctx('GET', '/students/x'), throwingHandler(err))),
    ).rejects.toBe(err);
    expect(spy).not.toHaveBeenCalled();
  });
});
