'use client';

import { useBranding } from '../../../lib/branding';
import { useSession } from '../../../lib/session';
import { logout } from '../../../lib/auth';

const ROLE_LABEL: Record<string, string> = {
  OWNER: '園長',
  ADMIN: '行政',
  TEACHER: '老師',
  BUS_TEACHER: '隨車老師',
  PARENT: '家長',
  GUARDIAN: '監護人',
};

async function handleLogout(): Promise<void> {
  await logout();
  window.location.reload();
}

// 清葉「我的」：個人資料 + 所屬園所 + 登出。
export default function MePage() {
  const { user } = useSession();
  const branding = useBranding();
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

      <button type="button" onClick={handleLogout} className="btn-secondary w-full">
        登出
      </button>
    </div>
  );
}
