import type { IconName } from '../components/Icon';
import type { RoleFlags } from './roles';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: IconName;
  // 這條在桌面後台還沒做 → 連到現有的手機版頁面，不做成點不下去的死角。
  onlyMobile?: boolean;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

// 桌面後台的導覽。**只列真的到得了的頁面**——尚未搬到桌面版的功能標「手機版」並連到 /liff/admin/*。
// 顯示與否依角色（僅影響畫面；真正授權一律在後端 Guard）。
export function adminNav(flags: RoleFlags): AdminNavSection[] {
  const schoolItems: AdminNavItem[] = [{ href: '/admin', label: '總覽', icon: 'home' }];
  if (flags.canManageSchool) {
    schoolItems.push({ href: '/admin/people', label: '人員與綁定', icon: 'user' });
  }

  const sections: AdminNavSection[] = [{ title: '園務', items: schoolItems }];

  if (flags.canManageSchool) {
    sections.push({
      title: '設定',
      items: [
        { href: '/liff/admin/classes', label: '班級', icon: 'doc', onlyMobile: true },
        { href: '/liff/admin/students', label: '學生', icon: 'heart', onlyMobile: true },
        { href: '/liff/admin/appearance', label: '園所外觀', icon: 'image', onlyMobile: true },
      ],
    });
  }

  sections.push({
    title: '每日',
    items: [
      { href: '/liff/communication-book', label: '聯絡簿', icon: 'book', onlyMobile: true },
      { href: '/liff/attendance', label: '出缺勤', icon: 'check', onlyMobile: true },
      { href: '/liff/leave', label: '請假', icon: 'cal', onlyMobile: true },
      { href: '/liff/announcement', label: '公告', icon: 'mega', onlyMobile: true },
    ],
  });

  if (flags.canViewAudit) {
    sections.push({
      title: '紀錄',
      items: [{ href: '/liff/audit', label: '稽核紀錄', icon: 'shield', onlyMobile: true }],
    });
  }

  return sections;
}
