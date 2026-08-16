import type { NextResponse } from 'next/server';

// Sproutin session cookie（httpOnly，防 XSS 竊取;OWASP 建議 session token 放 httpOnly cookie）。
// 值＝後端簽發的 Sproutin JWT（已 7d 效期）。same-origin，first-party，SameSite=Lax。
export const SESSION_COOKIE = 'sp_session';

// 對齊 JWT 效期（auth.module signOptions expiresIn '7d'）。
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function baseOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, { ...baseOptions(), maxAge: MAX_AGE_SECONDS });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { ...baseOptions(), maxAge: 0 });
}
