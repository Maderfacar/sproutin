import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditEnqueuer } from './audit-enqueuer.service';
import { AUDIT_READ_KEY, AuditReadMeta } from './audit-read.decorator';
import { actorRoleOf, AuditRequestLike } from './audit.util';

// 敏感 READ 稽核攔截器（全域;僅對標了 @AuditRead 的端點作用）。
// 成功回應後 enqueue 一筆 READ 稽核（out-of-band）;失敗則由 AuditFailureInterceptor 處理。
@Injectable()
export class AuditReadInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly enqueuer: AuditEnqueuer,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditReadMeta | undefined>(AUDIT_READ_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未標記 → 不記錄（一般 GET 不產生 audit）。
    if (!meta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<AuditRequestLike>();
    return next.handle().pipe(
      tap(() => {
        const resourceId = meta.param
          ? (req.params?.[meta.param] ?? null)
          : meta.query
            ? ((req.query?.[meta.query] as string | undefined) ?? null)
            : null;
        // fire-and-forget（enqueue 永不丟出、不阻塞）。
        void this.enqueuer.enqueue({
          actorUserId: req.user?.id ?? null,
          actorRole: actorRoleOf(req.user),
          action: meta.action ?? 'read',
          resourceType: meta.resourceType,
          resourceId,
          result: 'SUCCESS',
          metadata: { method: req.method ?? null, path: req.originalUrl ?? req.url ?? '' },
        });
      }),
    );
  }
}
