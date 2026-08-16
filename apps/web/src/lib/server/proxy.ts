import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './session-cookie';

// 通用 same-origin proxy（ADR-001）：把瀏覽器請求轉發到後端 API。
// - 授權改走 httpOnly session cookie：讀 sp_session（JWT）→ 注入 Authorization: Bearer 給後端。
//   後端維持 Bearer 介面不變（cookie 邏輯只在此 same-origin 層）。
// - API_INTERNAL_URL 為 server-only，永不外洩;轉發 query string 與（非 GET/HEAD 的）body。
export async function proxyToApi(req: Request, path: string): Promise<NextResponse> {
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  if (!apiInternalUrl) {
    return NextResponse.json({ error: 'api_unconfigured' }, { status: 503 });
  }

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await req.text() : undefined;

  const search = new URL(req.url).search;
  const token = cookies().get(SESSION_COOKIE)?.value;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
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
