// LINE 圖文選單／外部連結指定的目的頁面。
//
// LIFF URL 可以帶路徑（https://liff.line.me/{liffId}/leave），LINE 會把那段路徑放進
// 落地網址的 `liff.state` 參數，**由 liff.init() 負責轉過去**。
// 但本 App 對「已經有 session 的人」刻意跳過 LIFF 初始化（見 lib/session：先試 /me，
// 有效就完全不碰 LINE，避免三不五時跳登入）—— 於是 liff.state 沒有人處理，
// 每一格選單都只會停在首頁。這裡自己處理，不依賴 SDK 有沒有被初始化。

export const LIFF_BASE = '/liff';

// 回傳應該導向的站內路徑；沒有指定或不安全時回 null（留在原地）。
// **只接受站內相對路徑**：帶協定或 //host 的值一律拒絕，否則等於開放任意轉址。
export function resolveLiffStatePath(search: string): string | null {
  const raw = new URLSearchParams(search).get('liff.state');
  if (!raw) {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null; // 壞掉的編碼，當作沒指定
  }

  const value = decoded.trim();
  if (!value || value === '/') {
    return null;
  }
  // 站外轉址防護：'//evil.com' 與 'https://evil.com' 都要擋。
  if (value.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return null;
  }

  const path = value.startsWith('/') ? value : `/${value}`;
  if (path === LIFF_BASE || path.startsWith(`${LIFF_BASE}/`)) {
    return path;
  }
  return `${LIFF_BASE}${path}`;
}

// 依目前網址決定要不要轉址；null = 不用轉（沒指定目的頁，或已經到站了）。
//
// 這一層存在的兩個理由（都是實際踩過的坑）：
//
// 1) 「轉址中」的旗標要有人關掉。/liff 的 layout 不會因為換頁而重掛，
//    設了旗標卻沒有人清 → 從圖文選單點進來就永遠停在轉圈圈的畫面。
//    改成每次都回一個明確的答案（要轉／不用轉），呼叫端照著設就不會卡住。
//
// 2) 網址上其餘的 query 要一起帶過去。LINE 登入導回時會帶 code / state，
//    那是 liff.init() 完成登入要用的；我們順手把它丟掉 → 登入永遠換不到 session
//    → 一直重新登入，畫面同樣停在載入中。
export function liffRedirectFor(search: string, pathname: string): string | null {
  const target = resolveLiffStatePath(search);
  if (!target) {
    return null;
  }
  const [path, targetSearch = ''] = target.split('?');
  if (path === pathname) {
    return null; // 已經在目的頁，再轉一次只會多閃一下
  }
  return `${path}${mergeSearch(search, targetSearch)}`;
}

// liff.state 自己帶的 query 優先；其餘沿用原網址的（liff.state 本身不留）。
function mergeSearch(original: string, targetSearch: string): string {
  const params = new URLSearchParams(targetSearch);
  const rest = new URLSearchParams(original);
  rest.delete('liff.state');
  rest.forEach((value, key) => {
    if (!params.has(key)) {
      params.append(key, value);
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
