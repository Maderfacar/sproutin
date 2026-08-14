import liff from '@line/liff';

export interface LiffLoginResult {
  idToken: string;
  sub: string | null; // token 內的 LINE User ID（seed 對映用的真值）
}

// 初始化 LIFF 並確保登入。
// - 未登入：導向 LINE 登入（返回後本頁會重跑），回傳 null。
// - 已登入：回傳 LINE ID token + 解碼後的 sub（需 openid scope）。
// LIFF_ID 由 runtime public config 提供（ADR-001），bundle 不含 per-school 值。
export async function ensureLiffLogin(liffId: string): Promise<LiffLoginResult | null> {
  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    liff.login();
    return null;
  }

  const decoded = liff.getDecodedIDToken();
  const nowSec = Math.floor(Date.now() / 1000);

  // LIFF 會回傳上次登入取得的 ID token,長時間後可能已過期（LINE verify 會拒絕）。
  // 偵測到（快）過期就強制重新登入,取得新鮮 token。
  const isExpired =
    !decoded || (typeof decoded.exp === 'number' && decoded.exp < nowSec + 30);
  if (isExpired) {
    liff.logout();
    liff.login();
    return null;
  }

  const idToken = liff.getIDToken();
  if (!idToken) {
    throw new Error('no_id_token（LIFF 需勾選 openid scope）');
  }

  return { idToken, sub: decoded.sub ?? null };
}
