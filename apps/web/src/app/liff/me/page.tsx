'use client';

import Link from 'next/link';
import { useBranding } from '../../../lib/branding';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';
import { ROLE_LABEL } from '../../../lib/roleLabels';
import { logout } from '../../../lib/auth';
import { Icon, type IconName } from '../../../components/Icon';

// 園所管理入口（僅 OWNER/ADMIN 可見;真正授權在後端 Guard）。
const ADMIN_LINKS: { href: string; title: string; description: string; icon: IconName }[] = [
  {
    href: '/liff/admin/appearance',
    title: '園所外觀',
    description: '名稱、代表色、園徽封面、功能卡片',
    icon: 'cog',
  },
  { href: '/liff/admin/classes', title: '班級管理', description: '新增班級、改名、刪除空班', icon: 'home' },
  {
    href: '/liff/admin/students',
    title: '學生管理',
    description: '新增學生、換班、在學狀態',
    icon: 'user',
  },
  {
    href: '/liff/admin/people',
    title: '人員管理',
    description: '老師與家長帳號、帶班與綁定小孩',
    icon: 'chat',
  },
  { href: '/liff/admin/roles', title: '權限設定', description: '一頁看完誰有什麼身分', icon: 'shield' },
  {
    href: '/liff/admin/bus',
    title: '娃娃車設定',
    description: '路線、接送點順序、指派隨車老師',
    icon: 'bus',
  },
  {
    href: '/liff/admin/messages',
    title: '發送訊息',
    description: '做一張卡片送到家長的 LINE（送出後不可收回）',
    icon: 'mega',
  },
];

async function handleLogout(): Promise<void> {
  await logout();
  window.location.reload();
}

// 清葉「我的」：個人資料 + 所屬園所 + 登出。
export default function MePage() {
  const { user } = useSession();
  const branding = useBranding();
  const flags = roleFlags(user.roles);
  const roleLabels = [...new Set(user.roles.map((r) => ROLE_LABEL[r.role] ?? r.role))];

  return (
    <div className="space-y-7">
      <section className="rise-in flex items-center gap-4">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ background: 'var(--brand-primary)' }}
          aria-hidden
        >
          {user.displayName.charAt(0)}
        </span>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">{user.displayName}</h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {roleLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-soft"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rise-in card p-5" style={{ animationDelay: '0.05s' }}>
        <p className="eyebrow">所屬園所</p>
        <p className="mt-2 font-serif text-lg font-semibold text-ink">{branding.brandName}</p>
      </section>

      {flags.canManageSchool && (
        <section className="rise-in" style={{ animationDelay: '0.1s' }}>
          <p className="eyebrow mb-1">園所管理</p>
          <div className="border-t border-line">
            {ADMIN_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 border-b border-line py-4 text-brand-primary transition hover:bg-black/[0.015]"
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{item.title}</span>
                  <span className="block text-xs text-ink-soft">{item.description}</span>
                </span>
                <Icon name="chev" className="ml-auto h-4 w-4 shrink-0 text-ink-soft" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <button type="button" onClick={handleLogout} className="btn-secondary w-full">
        登出
      </button>
    </div>
  );
}
