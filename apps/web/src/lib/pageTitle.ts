import { isPathWithin, toMobileHref } from './surface';

// 瀏覽器分頁上的標題。
//
// 之前每一頁的分頁都寫著「Sproutin」——開了五個分頁就分不出哪個是哪個，
// 用電腦 demo 時分頁列看起來像沒做完的專案。
//
// **鍵一律用手機版網址**（與 lib/surface.ts 的 PAIRS 同一個慣例）：
// 一個功能只寫一次，桌面版網址先用 toMobileHref 翻回來再查。
// 三個桌面版專屬的頁面（總覽 / 登入 / 綁定）沒有手機版對應，直接列在這裡。
const TITLES: Record<string, string> = {
  '/liff': '首頁',
  '/liff/communication-book': '聯絡簿',
  '/liff/attendance': '出缺勤',
  '/liff/leave': '請假',
  '/liff/announcement': '公告',
  '/liff/notification': '通知',
  '/liff/audit': '稽核紀錄',
  '/liff/bus': '娃娃車點名',
  '/liff/me': '我的',
  '/liff/message': '聯絡簿',
  '/liff/student': '學生',
  '/liff/soon': '即將推出',
  '/liff/admin/appearance': '園所外觀設計',
  '/liff/admin/people': '人員與綁定',
  '/liff/admin/roles': '權限設定',
  '/liff/admin/messages': '發送訊息',
  '/liff/admin/classes': '班級',
  '/liff/admin/students': '學生',
  '/liff/admin/bus': '娃娃車設定',
  '/admin': '總覽',
  '/admin/login': '登入',
  '/admin/bind': '綁定',
};

// 長的前綴先比 —— `/liff/admin/bus` 必須贏過 `/liff`，`/admin/login` 必須贏過 `/admin`。
const PREFIXES = Object.keys(TITLES).sort((a, b) => b.length - a.length);

export function pageTitleFor(pathname: string): string | null {
  const key = toMobileHref(pathname);
  for (const prefix of PREFIXES) {
    if (isPathWithin(key, prefix)) {
      return TITLES[prefix] ?? null;
    }
  }
  return null;
}

// 分頁上實際顯示的字。認不出來的網址只顯示園名，不要硬掰一個頁名。
export function documentTitleFor(pathname: string, brandName: string): string {
  const page = pageTitleFor(pathname);
  return page ? `${page} · ${brandName}` : brandName;
}
