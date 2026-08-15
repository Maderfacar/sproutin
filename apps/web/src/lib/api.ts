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
    const data = (await res.json()) as { message?: unknown; error?: unknown };
    const raw = data.message ?? data.error;
    const code = typeof raw === 'string' && raw.length > 0 ? raw : `HTTP_${res.status}`;
    return new ApiError(res.status, code);
  } catch {
    return new ApiError(res.status, `HTTP_${res.status}`);
  }
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
