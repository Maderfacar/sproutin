import { NextResponse, type NextRequest } from 'next/server';
import { setSessionCookie } from '../../../lib/server/session-cookie';
import {
  OAUTH_STATE_COOKIE,
  clearOauthStateCookie,
  exchangeCodeForIdToken,
  publicOrigin,
  readOauthConfig,
  setBindTokenCookie,
} from '../../../lib/server/line-oauth';

// LINE 授權完成後把使用者送回這裡（此路徑需與 LINE Developers 後台的 Callback URL 一致）。
// 這裡做完四件事後就把人導走，畫面全部交給 /admin 或 /admin/login：
//   ① 驗 state（防 CSRF）② code 換 id_token ③ 走既有 /auth/line/login 換 Sproutin JWT ④ 設 session cookie。
// 認不出這個 LINE（user_not_provisioned）不是錯誤，是還沒綁定 → 暫存 id_token 後導向綁定畫面。
export const dynamic = 'force-dynamic';

function backToLogin(origin: string, reason: string): NextResponse {
  const res = NextResponse.redirect(`${origin}/admin/login?error=${reason}`);
  clearOauthStateCookie(res);
  return res;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const origin = publicOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // 使用者在 LINE 頁面按了取消 → LINE 會帶 error 回來。
  if (url.searchParams.get('error')) {
    return backToLogin(origin, 'cancelled');
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return backToLogin(origin, 'state');
  }

  const config = readOauthConfig();
  if (!config) {
    return backToLogin(origin, 'unconfigured');
  }

  const apiInternalUrl = process.env.API_INTERNAL_URL;
  if (!apiInternalUrl) {
    return backToLogin(origin, 'unconfigured');
  }

  let idToken: string;
  try {
    idToken = await exchangeCodeForIdToken(code, origin, config);
  } catch {
    return backToLogin(origin, 'exchange');
  }

  const upstream = await fetch(`${apiInternalUrl}/auth/line/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    cache: 'no-store',
  });

  const text = await upstream.text();

  if (!upstream.ok) {
    if (text.includes('user_not_provisioned')) {
      // 這個 LINE 還沒接上任何園所帳號 → 帶著 id_token 去綁定畫面（token 只放 httpOnly cookie）。
      const res = NextResponse.redirect(`${origin}/admin/bind`);
      clearOauthStateCookie(res);
      setBindTokenCookie(res, idToken);
      return res;
    }
    if (text.includes('user_inactive')) {
      return backToLogin(origin, 'inactive');
    }
    return backToLogin(origin, 'login');
  }

  const data = JSON.parse(text) as { accessToken: string };
  const res = NextResponse.redirect(`${origin}/admin`);
  clearOauthStateCookie(res);
  setSessionCookie(res, data.accessToken);
  return res;
}
