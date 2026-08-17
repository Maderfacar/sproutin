import { NextResponse, type NextRequest } from 'next/server';
import { setSessionCookie } from '../../../../../lib/server/session-cookie';
import { BIND_TOKEN_COOKIE, clearBindTokenCookie } from '../../../../../lib/server/line-oauth';

// 綁定換發：收 { idToken, code } → 後端驗證 LINE token 並兌換綁定碼 → 設 httpOnly cookie → 回 { user }。
// 與 login 同形狀（綁定成功即等同登入，使用者不必再操作一次）。
//
// 兩種來源的 idToken：
//   手機（LIFF）—— SDK 在前端拿到，隨 body 送上來。
//   電腦（網頁版 OAuth）—— 在伺服器端換得，存 httpOnly cookie，前端拿不到也不需要拿。
// 因此 body 沒帶 idToken 時改讀 cookie，兩條路共用同一個後端端點。
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  if (!apiInternalUrl) {
    return NextResponse.json({ error: 'api_unconfigured' }, { status: 503 });
  }

  const raw = (await req.json()) as { idToken?: string; code?: unknown };
  const idToken = raw.idToken ?? req.cookies.get(BIND_TOKEN_COOKIE)?.value;
  if (!idToken) {
    return NextResponse.json({ error: 'bind_session_expired' }, { status: 401 });
  }

  const body = JSON.stringify({ idToken, code: raw.code });
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
  // 綁定完成後暫存的 id_token 就沒有用途了，立刻清掉（少一個可被重放的憑證）。
  clearBindTokenCookie(res);
  return res;
}
