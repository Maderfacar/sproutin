import { randomBytes } from 'node:crypto';
import type { NextResponse } from 'next/server';

// LINE Login 網頁版 OAuth（桌面後台專用）。
// 與 LIFF 是**同一個 LINE Login channel** —— 兩邊拿到的 id_token 其 aud 都等於 LINE_LOGIN_CHANNEL_ID，
// 所以後端 LineVerifier 完全不必改，認出來的是同一個 LineIdentity / User / RBAC。
// 差別只在「怎麼拿到 id_token」：LIFF 由 SDK 直接給；網頁版要用 code 換，而換的那一步需要 channel secret。
//
// 端點與參數依 LINE 官方文件（developers.line.biz /docs/line-login/integrate-line-login）：
//   authorize: response_type=code, client_id, redirect_uri, state, scope
//   token:     grant_type=authorization_code, code, redirect_uri, client_id, client_secret → 回 id_token
// 未採 PKCE：token 交換在伺服器端進行且必帶 client_secret（confidential client），
// code 也已綁定 redirect_uri 並為一次性，PKCE 在此不增加實質保護。CSRF 由 state cookie 擋。
const AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';

// 需與 LINE Developers 後台登記的 Callback URL 完全一致。
export const CALLBACK_PATH = '/admin/callback';

// state：防 CSRF（別人不能誘導你的瀏覽器完成一次他發起的授權）。httpOnly、短效、用完即清。
export const OAUTH_STATE_COOKIE = 'sp_oauth_state';
// 綁定用的 id_token 暫存：登入成功但這個 LINE 還沒接上帳號時，把 token 留在 httpOnly cookie，
// 讓 /admin/bind 頁面兌換綁定碼時使用。**刻意不交給 JS**，避免 token 落入前端。
export const BIND_TOKEN_COOKIE = 'sp_bind';

const STATE_MAX_AGE = 60 * 10; // 10 分鐘足夠完成一次登入
const BIND_MAX_AGE = 60 * 10;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function setOauthStateCookie(res: NextResponse, state: string): void {
  res.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions(STATE_MAX_AGE));
}

export function clearOauthStateCookie(res: NextResponse): void {
  res.cookies.set(OAUTH_STATE_COOKIE, '', cookieOptions(0));
}

export function setBindTokenCookie(res: NextResponse, idToken: string): void {
  res.cookies.set(BIND_TOKEN_COOKIE, idToken, cookieOptions(BIND_MAX_AGE));
}

export function clearBindTokenCookie(res: NextResponse): void {
  res.cookies.set(BIND_TOKEN_COOKIE, '', cookieOptions(0));
}

export function randomState(): string {
  return randomBytes(16).toString('hex');
}

// 瀏覽器實際看到的網址（Vercel 位於反向代理後，req.url 可能是內部部署網址）。
// redirect_uri 必須與 LINE 後台登記的完全一致，不一致時 LINE 會直接拒絕 —— 不會有靜默錯誤。
export function publicOrigin(req: Request): string {
  const explicit = process.env.WEB_PUBLIC_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (!host) {
    throw new Error('cannot_resolve_public_origin');
  }
  return `${proto}://${host}`;
}

export interface LineOauthConfig {
  channelId: string;
  channelSecret: string;
}

// 設定齊全才可能走網頁版登入；缺任何一項都回 null，由呼叫端導向可讀的錯誤畫面
// （而不是把使用者丟到 LINE 才失敗）。
export function readOauthConfig(): LineOauthConfig | null {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  if (!channelId || !channelSecret) {
    return null;
  }
  return { channelId, channelSecret };
}

export function buildAuthorizeUrl(origin: string, channelId: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: `${origin}${CALLBACK_PATH}`,
    state,
    // openid 才會回 id_token（我們只要身分，不取 email）。
    scope: 'profile openid',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

// code → id_token。失敗一律丟錯，由 callback 導向登入頁並顯示原因代碼。
export async function exchangeCodeForIdToken(
  code: string,
  origin: string,
  config: LineOauthConfig,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${origin}${CALLBACK_PATH}`,
    client_id: config.channelId,
    client_secret: config.channelSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('line_token_exchange_failed');
  }

  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) {
    throw new Error('line_id_token_missing');
  }
  return data.id_token;
}
