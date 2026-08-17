import type { IconName } from '../components/Icon';
import type { RoleFlags } from './roles';

export interface AdminEntry {
  href: string;
  icon: IconName;
  label: string;
  hint: string;
}

// 管理首頁的「常用」入口。
// 連到手機版版型的頁面一律帶 from=admin —— 少了它，使用者按返回會被丟到手機版首頁
// （Human Owner 2026-08-17 回報的問題;見 lib/backTarget）。有測試守著這件事。
export function adminEntries(flags: RoleFlags): AdminEntry[] {
  const entries: AdminEntry[] = [];

  if (flags.canManageSchool) {
    entries.push(
      {
        href: '/admin/people',
        icon: 'user',
        label: '人員與綁定',
        hint: '新增帳號、指派班級、發綁定碼',
      },
      { href: '/admin/roles', icon: 'shield', label: '權限設定', hint: '一頁看完誰有什麼身分' },
      {
        href: '/admin/students',
        icon: 'heart',
        label: '學生管理',
        hint: '新增學生、調整班級、指派娃娃車接送點',
      },
      {
        href: '/admin/messages',
        icon: 'mega',
        label: '發送訊息',
        hint: '做一張卡片送到家長的 LINE（送出後不可收回）',
      },
      {
        href: '/admin/appearance',
        icon: 'image',
        label: '園所外觀設計',
        hint: 'LINE 選單、園名、顏色、園徽、封面圖',
      },
      {
        href: '/admin/bus',
        icon: 'bus',
        label: '娃娃車',
        hint: '路線、接送點順序、指派隨車老師',
      },
    );
  }

  entries.push(
    {
      href: '/liff/announcement?from=admin',
      icon: 'mega',
      label: '公告',
      hint: '發布給全校或單一班級',
    },
    {
      href: '/liff/communication-book?from=admin',
      icon: 'book',
      label: '聯絡簿',
      hint: '填寫與送出當日聯絡簿',
    },
  );

  return entries;
}
