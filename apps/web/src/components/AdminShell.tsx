'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useBranding } from '../lib/branding';
import { useSession } from '../lib/session';
import { roleFlags } from '../lib/roles';
import { adminNav } from '../lib/adminNav';
import { ROLE_LABEL } from '../lib/roleLabels';
import { logout } from '../lib/auth';
import { Icon } from './Icon';

// 桌面後台外框：左側常駐導覽 + 主內容。與手機版 AppShell 是同一套設計語言（清葉）的兩種密度，
// 裡面的功能元件完全共用 —— 差別只有外框，不是兩套 App。
// 窄畫面（例如園長臨時用平板開）自動改為上方橫向捲動的導覽列，不做第二套版型。
export function AdminShell({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const { user } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const sections = adminNav(roleFlags(user.roles));

  const roleText = user.roles
    .map((r) => ROLE_LABEL[r.role] ?? r.role)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(' · ');

  async function signOut(): Promise<void> {
    await logout();
    router.replace('/admin/login');
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-surface/70 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={branding.brandName}
              className="h-9 w-9 rounded-full border border-brand-primary/40 bg-surface object-contain"
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] font-bold"
              style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
            >
              {branding.brandName.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-serif text-base font-semibold text-ink">
              {branding.brandName}
            </p>
            <p className="text-[11px] tracking-[0.16em] text-ink-soft">園務後台</p>
          </div>
        </div>

        <nav className="flex gap-4 overflow-x-auto px-5 pb-4 md:block md:space-y-5 md:overflow-visible md:px-3">
          {sections.map((section) => (
            <div key={section.title} className="shrink-0">
              <p className="eyebrow hidden md:block md:px-2 md:pb-1.5">{section.title}</p>
              <ul className="flex gap-2 md:block md:space-y-0.5">
                {section.items.map((item) => {
                  const active = item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        // 帶 from=admin：那些頁面是手機版版型，返回鍵才知道要回後台而不是手機版首頁。
                        href={item.onlyMobile ? `${item.href}?from=admin` : item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-2.5 whitespace-nowrap rounded-md2 px-2.5 py-2 text-sm transition ${
                          active
                            ? 'bg-brand-primary/10 font-semibold text-brand-primary'
                            : 'text-ink-soft hover:bg-black/[0.03] hover:text-ink'
                        }`}
                      >
                        <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.onlyMobile && (
                          <span className="hidden shrink-0 rounded-full border border-line px-1.5 py-0.5 text-[10px] font-normal text-ink-soft md:inline">
                            手機版
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-line px-5 py-4 md:block">
          <p className="truncate text-sm font-semibold text-ink">{user.displayName}</p>
          <p className="truncate text-xs text-ink-soft">{roleText}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 text-xs text-ink-soft underline underline-offset-4 transition hover:text-ink"
          >
            登出
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
