'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '@sproutin/shared';
import { ensureLiffLogin } from './liff';
import { AuthError, lineLogin, fetchMe } from './auth';
import { StatusScreen, type StatusKind } from '../components/StatusScreen';
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
    return (
      <StatusScreen
        // 'authed'（缺 user）與 'needs-binding'（缺 idToken）都是不該發生的中間態，
        // 一律退回 loading 而不是讓畫面崩掉。
        status={state.status === 'authed' || state.status === 'needs-binding' ? 'loading' : state.status}
        message={state.message}
        sub={state.sub}
      />
    );
  }

  return <AuthedSession user={state.user}>{children}</AuthedSession>;
}
