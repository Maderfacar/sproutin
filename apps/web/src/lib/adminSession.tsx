'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@sproutin/shared';
import { fetchMe, logout } from './auth';
import { AuthedSession } from './session';
import { roleFlags } from './roles';
import { StatusScreen } from '../components/StatusScreen';
import { Button } from '../components/ui';

// 桌面後台的身分取得：**只看 httpOnly cookie**，完全不碰 LIFF（電腦上沒有 LINE App）。
//   有 session → 直接進後台。
//   沒有 → 導向 /admin/login（那裡才會發動 LINE 網頁版登入）。
// 綁定不在這裡處理 —— 桌面版的「登入成功但還沒綁定」由 callback 導向 /admin/bind，
// 因為那時還沒有 session，走不到這個 provider。
interface AdminSessionState {
  status: 'loading' | 'authed' | 'anonymous' | 'error';
  user?: AuthUser;
  message?: string;
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AdminSessionState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const user = await fetchMe();
        if (cancelled) return;
        setState(user ? { status: 'authed', user } : { status: 'anonymous' });
      } catch (e: unknown) {
        if (cancelled) return;
        setState({ status: 'error', message: e instanceof Error ? e.message : '登入失敗' });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.status === 'anonymous') {
      router.replace('/admin/login');
    }
  }, [state.status, router]);

  if (state.status === 'error') {
    return <StatusScreen fullScreen status="error" message={state.message} />;
  }
  if (state.status !== 'authed' || !state.user) {
    return <StatusScreen fullScreen status="loading" message="確認身分中…" />;
  }

  // 家長沒有後台可用的東西。與其給一片空白，不如講清楚該去哪裡。
  if (!roleFlags(state.user.roles).isStaff) {
    return <ParentNotice name={state.user.displayName} />;
  }

  return <AuthedSession user={state.user}>{children}</AuthedSession>;
}

function ParentNotice({ name }: { name: string }) {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <p className="text-2xs font-semibold text-ink-mute">園務後台</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">
        {name}，這裡是給園所人員用的
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        你的帳號是家長身分，聯絡簿、請假、通知都在手機的 LINE 選單裡。
        請用手機打開園所的 LINE 官方帳號，從下方選單進入。
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button href="/liff" variant="primary">
          在這台裝置上打開家長頁面
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void logout().then(() => router.replace('/admin/login'));
          }}
        >
          換一個帳號登入
        </Button>
      </div>
    </main>
  );
}
