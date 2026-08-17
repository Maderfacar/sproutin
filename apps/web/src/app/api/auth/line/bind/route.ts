import { NextResponse } from 'next/server';
import { setSessionCookie } from '../../../../../lib/server/session-cookie';

// 綁定換發：收 { idToken, code } → 後端驗證 LINE token 並兌換綁定碼 → 設 httpOnly cookie → 回 { user }。
// 與 login 同形狀（綁定成功即等同登入，使用者不必再操作一次）。
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  if (!apiInternalUrl) {
    return NextResponse.json({ error: 'api_unconfigured' }, { status: 503 });
  }

  const body = await req.text();
  const upstream = await fetch(`${apiInternalUrl}/auth/line/bind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    // 原樣回傳錯誤（binding_code_invalid / line_already_bound / user_inactive…）。
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
