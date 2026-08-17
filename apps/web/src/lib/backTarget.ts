// 「上一頁」要回哪裡。
//
// 問題：手機版子頁的返回鍵原本寫死回 /liff 首頁。從桌面後台點進手機版功能（班級、聯絡簿…）
// 之後按返回，會被丟到手機版首頁，而不是回到後台。
//
// 作法：**只有從後台進來的人才改變返回目標**，手機版原本的行為完全不動（那是已驗收的流程，
// 不用瀏覽器歷史猜測，因為 LIFF 在 LINE 內是經過多次轉址進來的，router.back() 會彈回登入鏈）。
// 後台的連結帶 ?from=admin，記在 sessionStorage，之後同一個分頁的子頁都回得去。

export const BACK_TARGET_KEY = 'sp_back_target';
export const ADMIN_HOME = '/admin';
export const MOBILE_HOME = '/liff';

// 純函式，方便測試：目前網址的 from 參數 + 先前記住的值 → 這一頁的返回目標。
export function resolveBackHref(from: string | null, stored: string | null): string {
  if (from === 'admin') {
    return ADMIN_HOME;
  }
  return stored === ADMIN_HOME ? ADMIN_HOME : MOBILE_HOME;
}

export function rememberBackTarget(from: string | null): void {
  if (from === 'admin') {
    window.sessionStorage.setItem(BACK_TARGET_KEY, ADMIN_HOME);
  }
}

// 使用者按了手機版底部頁籤 = 他要留在手機版 → 忘掉後台這條線。
export function clearBackTarget(): void {
  window.sessionStorage.removeItem(BACK_TARGET_KEY);
}

export function readBackTarget(): string | null {
  return window.sessionStorage.getItem(BACK_TARGET_KEY);
}
