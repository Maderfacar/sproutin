import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

// 只用到 status().json()，以結構型別描述,避免依賴 express 型別宣告。
interface HttpResponseLike {
  status(code: number): HttpResponseLike;
  json(body: unknown): HttpResponseLike;
}

// 全域例外過濾器（Phase 8 hardening / docs/07 §1）。
// - 所有錯誤回應統一為 { success:false, error:{ code, message } }。
// - HttpException：沿用其狀態碼 + 訊息碼（如 out_of_scope / LEAVE_INVALID_TRANSITION / missing_token）。
// - 未預期錯誤：500 + 通用訊息,**不洩漏 stack / 內部細節**（僅 server log 記錄）。
// 成功回應維持原樣（各端點原始 JSON;不在此包裝,避免破壞既有前端）。
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<HttpResponseLike>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = this.extractCode(exception);
      res.status(status).json({ success: false, error: { code, message: code } });
      return;
    }

    // 未預期錯誤 → 記 server log（含 stack）、對外只回通用 500。
    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
    );
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'internal_error' } });
  }

  // 取機器可讀的訊息碼。controller 多以字串 throw（如 'invalid_input'）;
  // class-validator 陣列訊息取第一則。
  private extractCode(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message: unknown }).message;
      return Array.isArray(message) ? String(message[0]) : String(message);
    }
    return exception.message;
  }
}
