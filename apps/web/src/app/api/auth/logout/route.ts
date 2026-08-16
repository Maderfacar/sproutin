import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../../lib/server/session-cookie';

// 登出：清除 session cookie（下次進入需重新 LINE 登入）。
export const dynamic = 'force-dynamic';

export function POST(): NextResponse {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
