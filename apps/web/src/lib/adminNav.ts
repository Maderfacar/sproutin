import type { IconName } from '../components/Icon';
import type { RoleFlags } from './roles';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: IconName;
  // 這條在桌面後台還沒做 → 連到現有的手機版頁面，不做成點不下去的死角。
  // 目前是空的（功能對等已補齊）；docs/04 §3b 規定新頁面兩個外框一起做，
  // 這個欄位留著是為了「萬一又出現不對等，至少不是死角」的退路，不是常態。
  onlyMobile?: boolean;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

// 桌面後台的導覽。**只列真的到得了的頁面**——尚未搬到桌面版的功能標「手機版」並連到 /liff/*。
// 顯示與否依角色（僅影響畫面；真正授權一律在後端 Guard）。
export function adminNav(flags: RoleFlags): AdminNavSection[] {
  const schoolItems: AdminNavItem[] = [{ href: '/admin', label: '總覽', icon: 'home' }];
  if (flags.canManageSchool) {
    schoolItems.push({ href: '/admin/people', label: '人員與綁定', icon: 'user' });
    schoolItems.push({ href: '/admin/roles', label: '權限設定', icon: 'shield' });
    // 群發只有園長／行政能用（花錢且不可收回，不下放給老師）。
    schoolItems.push({ href: '/admin/messages', label: '發送訊息', icon: 'mega' });
  }

  const sections: AdminNavSection[] = [{ title: '園務', items: schoolItems }];

  if (flags.canManageSchool) {
    sections.push({
      title: '設定',
      items: [
        { href: '/admin/appearance', label: '園所外觀設計', icon: 'image' },
        { href: '/admin/bus', label: '娃娃車', icon: 'bus' },
        { href: '/admin/classes', label: '班級', icon: 'doc' },
        { href: '/admin/students', label: '學生', icon: 'heart' },
      ],
    });
  }

  const dailyItems: AdminNavItem[] = [
    { href: '/admin/communication-book', label: '聯絡簿', icon: 'book' },
  ];
  // 點名本身是車上的事（手機），但園所要看得到今天誰上了車。
  if (flags.canMarkBusRide) {
    dailyItems.push({ href: '/admin/bus-roster', label: '娃娃車點名', icon: 'bus' });
  }

  sections.push({
    title: '每日',
    items: [
      ...dailyItems,
      { href: '/admin/attendance', label: '出缺勤', icon: 'check' },
      { href: '/admin/leave', label: '請假', icon: 'cal' },
      { href: '/admin/announcement', label: '公告', icon: 'mega' },
      { href: '/admin/notification', label: '通知', icon: 'bell' },
    ],
  });

  if (flags.canViewAudit) {
    sections.push({
      title: '紀錄',
      items: [{ href: '/admin/audit', label: '稽核紀錄', icon: 'shield' }],
    });
  }

  return sections;
}
