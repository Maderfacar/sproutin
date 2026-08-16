import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  type ArgumentsHost,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

// 驗證全域過濾器統一錯誤信封 + 不洩漏未預期錯誤細節。

interface CapturedResponse {
  statusCode?: number;
  body?: unknown;
}

function makeHost(captured: CapturedResponse): ArgumentsHost {
  const res = {
    status(code: number) {
      captured.statusCode = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  };
  return {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}), getNext: () => ({}) }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('HttpException（字串 throw）→ 沿用狀態碼 + code=訊息', () => {
    const captured: CapturedResponse = {};
    filter.catch(new ForbiddenException('out_of_scope'), makeHost(captured));
    expect(captured.statusCode).toBe(403);
    expect(captured.body).toEqual({ success: false, error: { code: 'out_of_scope', message: 'out_of_scope' } });
  });

  it('ConflictException → 409 + 訊息碼', () => {
    const captured: CapturedResponse = {};
    filter.catch(new ConflictException('LEAVE_INVALID_TRANSITION'), makeHost(captured));
    expect(captured.statusCode).toBe(409);
    expect((captured.body as { error: { code: string } }).error.code).toBe('LEAVE_INVALID_TRANSITION');
  });

  it('BadRequestException → 400', () => {
    const captured: CapturedResponse = {};
    filter.catch(new BadRequestException('invalid_input'), makeHost(captured));
    expect(captured.statusCode).toBe(400);
  });

  it('未預期錯誤 → 500 通用訊息,不洩漏內部細節', () => {
    const captured: CapturedResponse = {};
    filter.catch(new Error('secret DB connection string leaked'), makeHost(captured));
    expect(captured.statusCode).toBe(500);
    expect(captured.body).toEqual({ success: false, error: { code: 'INTERNAL_ERROR', message: 'internal_error' } });
    expect(JSON.stringify(captured.body)).not.toContain('secret');
  });
});
