import { NextResponse } from 'next/server';

// 通用 same-origin proxy（ADR-001）：把瀏覽器請求轉發到後端 API。
// - API_INTERNAL_URL 為 server-only，永不外洩給瀏覽器。
// - 轉發 Authorization header、query string、與（非 GET/HEAD 的）request body。
// - 原樣回傳後端狀態碼與 JSON 內容，讓前端統一以 apiFetch 解讀。
export async function proxyToApi(req: Request, path: string): Promise<NextResponse> {
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  if (!apiInternalUrl) {
    return NextResponse.json({ error: 'api_unconfigured' }, { status: 503 });
  }

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await req.text() : undefined;

  const search = new URL(req.url).search;
  const authorization = req.headers.get('authorization') ?? '';

  const headers: Record<string, string> = { Authorization: authorization };
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${apiInternalUrl}${path}${search}`, {
    method,
    headers,
    body,
    cache: 'no-store',
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
