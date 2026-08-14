import { Injectable, UnauthorizedException } from '@nestjs/common';

// LIFF 取得的 LINE ID token 驗證結果（僅取認證所需欄位）。
// sub = LINE User ID —— **僅供認證**，不得作為任何業務外鍵（docs/02 修正 D）。
export interface LineIdTokenPayload {
  sub: string;
  aud: string;
  exp: number;
  name?: string;
  picture?: string;
}

// 以 LINE 官方 verify 端點驗證 ID token（Step 2 決定：verify 端點，非本地 JWKS）。
// 抽成可注入 service，讓測試可 mock（CI 不需真 LINE）。
@Injectable()
export class LineVerifier {
  private readonly verifyUrl = 'https://api.line.me/oauth2/v2.1/verify';

  async verify(idToken: string): Promise<LineIdTokenPayload> {
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    if (!channelId) {
      // 設定缺漏屬伺服器錯誤，非使用者錯誤。
      throw new Error('LINE_LOGIN_CHANNEL_ID not configured');
    }

    const body = new URLSearchParams({ id_token: idToken, client_id: channelId });

    let res: Response;
    try {
      res = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch {
      throw new UnauthorizedException('line_verify_unreachable');
    }

    if (!res.ok) {
      throw new UnauthorizedException('line_token_invalid');
    }

    const payload = (await res.json()) as LineIdTokenPayload;

    // audience 必須等於本 channel，避免其他 channel 的 token 被接受。
    if (!payload.sub || payload.aud !== channelId) {
      throw new UnauthorizedException('line_token_mismatch');
    }

    return payload;
  }
}
