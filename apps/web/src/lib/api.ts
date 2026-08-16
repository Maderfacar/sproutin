// 前端 API 客戶端：一律走 same-origin /api/*（proxy 到後端），附帶 Bearer token。
// 後端錯誤回應非統一信封（NestException 預設 { statusCode, message, error }），
// 這裡抽出可顯示的訊息碼，供 UI 呈現友善訊息。

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    // 後端統一錯誤信封（Phase 8）：{ success:false, error:{ code, message } }。
    // 保留對舊形狀（NestException { message }）的回退,以防非信封路徑（如 proxy 503）。
    const data = (await res.json()) as {
      error?: { code?: string; message?: string } | string;
      message?: unknown;
    };
    const fromEnvelope =
      typeof data.error === 'object' && data.error !== null
        ? (data.error.code ?? data.error.message)
        : typeof data.error === 'string'
          ? data.error
          : undefined;
    const fallback = typeof data.message === 'string' ? data.message : undefined;
    const code = fromEnvelope ?? fallback ?? `HTTP_${res.status}`;
    return new ApiError(res.status, code);
  } catch {
    return new ApiError(res.status, `HTTP_${res.status}`);
  }
}

// 通用錯誤碼→中文訊息（各功能可再包一層處理專屬碼，如 leave 的 LEAVE_INVALID_TRANSITION）。
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'out_of_scope':
        return '你沒有這筆資料的權限。';
      case 'invalid_input':
        return '輸入內容有誤，請檢查後再送出。';
      default:
        return `操作失敗（${error.code}）。`;
    }
  }
  return '操作失敗，請稍後再試。';
}

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(path, { headers: authHeaders(accessToken), cache: 'no-store' });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return (await res.json()) as T;
}

export async function apiSend<T>(
  path: string,
  accessToken: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      ...authHeaders(accessToken),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
