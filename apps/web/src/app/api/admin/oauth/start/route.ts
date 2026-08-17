import { NextResponse } from 'next/server';
import {
  buildAuthorizeUrl,
  publicOrigin,
  randomState,
  readOauthConfig,
  setOauthStateCookie,
} from '../../../../../lib/server/line-oauth';

// 桌面後台登入的起點：產生 state → 存 httpOnly cookie → 導向 LINE 授權頁。
// 用 GET（瀏覽器直接導頁），因此登入按鈕是一個連結而非 fetch。
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const config = readOauthConfig();
  const origin = publicOrigin(req);

  if (!config) {
    // 缺 env 時不要把人丟去 LINE 才失敗，直接回登入頁講清楚是設定問題。
    return NextResponse.redirect(`${origin}/admin/login?error=unconfigured`);
  }

  const state = randomState();
  const res = NextResponse.redirect(buildAuthorizeUrl(origin, config.channelId, state));
  setOauthStateCookie(res, state);
  return res;
}
