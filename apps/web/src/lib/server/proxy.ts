import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './session-cookie';

// 依 HTTP 規格不得帶 body 的狀態碼。
const NO_BODY_STATUSES = new Set([204, 205, 304]);

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

  // 204/205/304 依規格**不能帶 body**；硬塞一個（就算是空字串）Response 建構子會直接丟錯，
  // 於是 Next 這一層回 500 —— 後端明明已經做完了，前端卻收到「操作失敗（HTTP_500）」，
  // 而且 mutation 的 onSuccess 不會跑，畫面停在舊資料
  // （Human Owner 2026-08-20 回報「解除 LINE 綁定」時踩到；所有 DELETE 端點都會踩到，
  //  不只綁定 —— 解除綁定小孩、移除帶班、刪班級、移除身分、刪接送點全部走同一條路）。
  if (NO_BODY_STATUSES.has(res.status) || text.length === 0) {
    return new NextResponse(null, { status: res.status });
  }

  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
