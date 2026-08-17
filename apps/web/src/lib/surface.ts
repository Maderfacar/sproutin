// 同一個功能在兩種外框下的網址。
//
// 問題：功能抽成共用元件之後（docs/04 §3b），元件裡的連結只能寫死一種網址。
// 寫 `/liff/...` 的話，園長在桌面後台按下去會被丟進手機版版型；
// 寫 `/admin/...` 的話，家長在 LINE 裡按下去會撞到後台的登入牆。
//
// 作法：共用元件裡一律寫**手機版網址**（既有網址，不必動），由這裡依「現在人在哪一種外框」翻譯。
// 還沒搬到桌面版的功能就留在手機版，但自動補上 `from=admin` ——
// 少了它，返回鍵會把人丟到手機版首頁而不是後台（見 lib/backTarget）。

export type Surface = 'admin' | 'mobile';

interface RoutePair {
  mobile: string;
  desktop: string;
}

// 兩邊都已經有的功能。比對用「前綴 + 路徑邊界」，所以動態路由（`/liff/student/<id>`）也涵蓋得到。
const PAIRS: RoutePair[] = [
  { mobile: '/liff/admin/appearance', desktop: '/admin/appearance' },
  { mobile: '/liff/admin/students', desktop: '/admin/students' },
  { mobile: '/liff/admin/messages', desktop: '/admin/messages' },
  { mobile: '/liff/admin/classes', desktop: '/admin/classes' },
  { mobile: '/liff/admin/people', desktop: '/admin/people' },
  { mobile: '/liff/admin/roles', desktop: '/admin/roles' },
  { mobile: '/liff/admin/bus', desktop: '/admin/bus' },
  { mobile: '/liff/student', desktop: '/admin/students' },
  { mobile: '/liff/audit', desktop: '/admin/audit' },
];

export function surfaceOf(pathname: string): Surface {
  return pathname.startsWith('/admin') ? 'admin' : 'mobile';
}

// 前綴必須停在路徑邊界，`/liff/bus`（點名）才不會被 `/liff/bus...` 以外的規則誤中。
function startsWithSegment(href: string, prefix: string): boolean {
  if (!href.startsWith(prefix)) {
    return false;
  }
  const next = href.charAt(prefix.length);
  return next === '' || next === '/' || next === '?' || next === '#';
}

function withFromAdmin(href: string): string {
  const hashAt = href.indexOf('#');
  const path = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  if (/[?&]from=/.test(path)) {
    return href;
  }
  return `${path}${path.includes('?') ? '&' : '?'}from=admin${hash}`;
}

export function toSurfaceHref(href: string, surface: Surface): string {
  if (surface !== 'admin' || !href.startsWith('/liff')) {
    return href;
  }
  for (const pair of PAIRS) {
    if (startsWithSegment(href, pair.mobile)) {
      return pair.desktop + href.slice(pair.mobile.length);
    }
  }
  return withFromAdmin(href);
}
