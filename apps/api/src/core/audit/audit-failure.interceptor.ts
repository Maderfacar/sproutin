import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuditEnqueuer } from './audit-enqueuer.service';
import { buildFailureAuditEntry, AuditRequestLike } from './audit.util';

// 只對「狀態變更請求」的伺服器端失敗補稽核（ADR-005 Case C）。
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SERVER_ERROR_THRESHOLD = 500;

// 伺服器端失敗稽核攔截器（全域）。對 5xx 失敗的狀態變更請求 enqueue 一筆 FAILURE 稽核，
// 記錄「曾嘗試且失敗」;隨後原樣 rethrow 交由 Nest 既有例外處理（不改回應行為）。
// 刻意**不記 4xx**（驗證錯誤 / 業務衝突 / DENIED 由 guards 另記），避免噪音。
@Injectable()
export class AuditFailureInterceptor implements NestInterceptor {
  constructor(private readonly enqueuer: AuditEnqueuer) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuditRequestLike>();
    return next.handle().pipe(
      catchError((err: unknown) => {
        const status = err instanceof HttpException ? err.getStatus() : SERVER_ERROR_THRESHOLD;
        const method = (req.method ?? '').toUpperCase();
        if (status >= SERVER_ERROR_THRESHOLD && MUTATING_METHODS.has(method)) {
          const message = err instanceof Error ? err.message : String(err);
          void this.enqueuer.enqueue(buildFailureAuditEntry(req, status, message));
        }
        return throwError(() => err);
      }),
    );
  }
}
