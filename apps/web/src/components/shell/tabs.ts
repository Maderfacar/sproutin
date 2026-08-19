import type { TabItem } from '../ui/TabBar';
import type { Persona } from '../../lib/persona';

// 三套殼的底部頁籤。**這一份表就是「三種身分」在畫面上的樣子。**
//
// 每一格都是那個身分「一天內會重複去的地方」，不是功能清單。
// 所以家長有「請假」（一年用幾次但焦急時要馬上找到）而沒有「出缺勤」（結果在首頁就看得到）；
// 老師有「點名」（每天必做）而沒有「公告」（偶爾才發，收在我的裡）。
//
// 上限四格。第五格開始使用者就要用找的，那等於回到「先讀一遍才知道去哪」。
//
// 隨車老師（bus）刻意不在這裡：他只有一條路線的點名，做完就關掉，
// 給他四個頁籤反而是負擔（Human Owner 2026-08-20）。
export const PERSONA_TABS: Record<Persona, readonly TabItem[]> = {
  parent: [
    { href: '/liff', label: '今天', icon: 'home', exact: true },
    { href: '/liff/communication-book', label: '聯絡簿', icon: 'book' },
    { href: '/liff/leave', label: '請假', icon: 'doc' },
    { href: '/liff/me', label: '我的', icon: 'user' },
  ],
  teacher: [
    { href: '/liff', label: '今天', icon: 'home', exact: true },
    { href: '/liff/attendance', label: '點名', icon: 'check' },
    { href: '/liff/communication-book', label: '聯絡簿', icon: 'book' },
    { href: '/liff/me', label: '我的', icon: 'user' },
  ],
  staff: [
    { href: '/liff', label: '總覽', icon: 'home', exact: true },
    { href: '/liff/admin/students', label: '名單', icon: 'user' },
    { href: '/liff/admin/messages', label: '訊息', icon: 'mega' },
    { href: '/liff/me', label: '我的', icon: 'cog' },
  ],
  // 給不出頁籤的身分留一個空陣列，殼會直接不畫底部列。
  bus: [],
};
