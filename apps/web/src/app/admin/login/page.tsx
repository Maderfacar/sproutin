'use client';

import { useEffect, useState } from 'react';
import { useBranding } from '../../../lib/branding';

// 登入失敗的原因一律用大白話說，並且說清楚「下一步該做什麼」。
const GENERIC_ERROR = '登入失敗，請稍後再試。若持續發生請聯絡園所。';

const ERROR_MESSAGE: Record<string, string> = {
  unconfigured: '系統還沒完成 LINE 登入設定，請聯絡系統管理者。',
  cancelled: '你在 LINE 頁面取消了登入。要進入後台請再按一次登入。',
  state: '登入逾時或連結不完整，請重新登入一次。',
  exchange: '與 LINE 溝通時發生問題，請稍後再試一次。',
  inactive: '這個帳號已停用，無法登入。請聯絡園所。',
  login: GENERIC_ERROR,
};

// 桌面後台的入口。這是全站唯一不需要身分的後台頁面。
// 按下登入＝導向 /api/admin/oauth/start（伺服器端產生 state 後轉往 LINE），
// 因此這裡是一般連結，不是 fetch —— 瀏覽器要真的離開本站再回來。
export default function AdminLoginPage() {
  const branding = useBranding();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    if (code) {
      setError(ERROR_MESSAGE[code] ?? GENERIC_ERROR);
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="card w-full max-w-sm p-8 text-center">
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logoUrl}
            alt={branding.brandName}
            className="mx-auto h-14 w-14 rounded-full border border-brand-primary/40 bg-surface object-contain"
          />
        ) : (
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] text-2xl font-bold"
            style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
          >
            {branding.brandName.charAt(0)}
          </span>
        )}

        <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight text-ink">
          {branding.brandName}
        </h1>
        <p className="mt-1 text-xs tracking-[0.18em] text-ink-soft">園務後台</p>

        <div className="my-6 h-px bg-line" />

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md2 border border-red-200 bg-red-50 p-3 text-left text-sm leading-relaxed text-red-700"
          >
            {error}
          </p>
        )}

        <a href="/api/admin/oauth/start" className="btn-primary block w-full text-center">
          用 LINE 登入
        </a>

        <p className="mt-5 text-xs leading-relaxed text-ink-soft">
          與手機版是同一個帳號。
          <br />
          家長與老師平常請直接從 LINE 選單進入。
        </p>
      </div>
    </main>
  );
}
