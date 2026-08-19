'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '@sproutin/shared';
import { ensureLiffLogin } from './liff';
import { AuthError, lineLogin, fetchMe } from './auth';
import { StatusScreen, type StatusKind } from '../components/StatusScreen';
import { SplashScreen } from '../components/SplashScreen';
import { useBranding } from './branding';
import { BindScreen } from '../features/binding/BindScreen';

// 登入 session（httpOnly cookie 持久化）：
//   1) 先試 /me（帶 cookie）——有有效 session → 直接登入,**完全不碰 LINE**（不再三不五時跳登入）。
//   2) 沒有 / 失效（401）→ 走 LIFF 登入 → 換發 session（設 cookie）。
// cookie 為 httpOnly,前端不持有 token;所有 /api/* 由 proxy 從 cookie 注入 Bearer。
interface Session {
  user: AuthUser;
}

const SessionContext = createContext<Session | null>(null);

// 已取得身分後把 user 掛進 context。手機（LIFF）與電腦（網頁版 OAuth）取得身分的方式不同，
// 但之後的功能元件一律用 useSession() —— 共用同一個 context，功能頁面不必分兩套。
export function AuthedSession({ user, children }: { user: AuthUser; children: ReactNode }) {
  return <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession 必須在 SessionProvider（authed）內使用');
  }
  return value;
}

interface SessionState {
  // 'needs-binding' = LINE 登入成功，但這個 LINE 帳號還沒接上任何園所帳號 → 導向綁定畫面。
  status: StatusKind | 'authed' | 'needs-binding';
  user?: AuthUser;
  message?: string;
  sub?: string | null;
  idToken?: string;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : '登入失敗';
}

export function SessionProvider({
  liffId,
  children,
}: {
  liffId: string | null;
  children: ReactNode;
}) {
  const branding = useBranding();
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        // 1) 先試既有 session（cookie）。
        const existing = await fetchMe();
        if (existing) {
          if (!cancelled) setState({ status: 'authed', user: existing });
          return;
        }

        // 2) 沒有有效 session → LINE 登入。
        if (!liffId) {
          throw new Error('liffId 未設定（/config/public）——請確認已 seed SchoolConfig.liffId');
        }
        const login = await ensureLiffLogin(liffId);
        if (login === null) {
          if (!cancelled) setState({ status: 'redirecting' });
          return; // 導向 LINE 登入中，返回後本頁會重跑
        }
        try {
          const user = await lineLogin(login.idToken);
          if (!cancelled) setState({ status: 'authed', user, sub: login.sub });
        } catch (e: unknown) {
          // 這個 LINE 還沒接上任何園所帳號 → 不是錯誤，是還沒綁定，導向綁定畫面。
          if (e instanceof AuthError && e.code === 'user_not_provisioned') {
            if (!cancelled) setState({ status: 'needs-binding', idToken: login.idToken });
            return;
          }
          throw e;
        }
      } catch (e: unknown) {
        if (!cancelled) setState({ status: 'error', message: errorMessage(e) });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  if (state.status === 'needs-binding' && state.idToken) {
    return (
      <BindScreen
        idToken={state.idToken}
        onBound={(user) => setState({ status: 'authed', user })}
      />
    );
  }

  if (state.status !== 'authed' || !state.user) {
    // 'authed'（缺 user）與 'needs-binding'（缺 idToken）都是不該發生的中間態，
    // 一律退回 loading 而不是讓畫面崩掉。
    const status =
      state.status === 'authed' || state.status === 'needs-binding' ? 'loading' : state.status;
    // 每一段等待講清楚自己在等什麼。手機端只能靠 Human Owner 回報畫面上的字，
    // 三個階段都寫「載入中…」的話，卡住時根本分不出是卡在哪一段。
    //
    // 還在等的時候給開場畫面（這時園所識別已經有了，家長看到的是自己那間幼兒園）；
    // 出錯了才換成 StatusScreen —— 錯誤要能重試、要看得到 sub，那是另一種畫面。
    if (status === 'error') {
      return <StatusScreen fullScreen status="error" message={state.message} sub={state.sub} />;
    }
    return (
      <SplashScreen
        brandName={branding.brandName}
        logoUrl={branding.logoUrl}
        message={state.message ?? (status === 'redirecting' ? '前往 LINE 登入…' : '確認登入狀態…')}
      />
    );
  }

  return <AuthedSession user={state.user}>{children}</AuthedSession>;
}
