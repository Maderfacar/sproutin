import { NextResponse } from 'next/server';
import { setSessionCookie } from '../../../../../lib/server/session-cookie';

// LINE 登入換發：收 { idToken } → 後端驗證換 Sproutin JWT → **設 httpOnly cookie**（same-origin）→
// 回傳 { user }（不把 token 交給 JS，防 XSS 竊取）。之後所有 /api/* 由 proxy 從 cookie 注入 Bearer。
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  if (!apiInternalUrl) {
    return NextResponse.json({ error: 'api_unconfigured' }, { status: 503 });
  }

  const body = await req.text();
  const upstream = await fetch(`${apiInternalUrl}/auth/line/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    // 原樣回傳錯誤（例如 user_not_provisioned / invalid token）。
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = JSON.parse(text) as { accessToken: string; user: unknown };
  const res = NextResponse.json({ user: data.user });
  setSessionCookie(res, data.accessToken);
  return res;
}
