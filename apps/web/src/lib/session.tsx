'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '@sproutin/shared';
import { ensureLiffLogin } from './liff';
import { lineLogin, fetchMe } from './auth';
import { StatusScreen, type StatusKind } from '../components/StatusScreen';

// 登入 session（httpOnly cookie 持久化）：
//   1) 先試 /me（帶 cookie）——有有效 session → 直接登入,**完全不碰 LINE**（不再三不五時跳登入）。
//   2) 沒有 / 失效（401）→ 走 LIFF 登入 → 換發 session（設 cookie）。
// cookie 為 httpOnly,前端不持有 token;所有 /api/* 由 proxy 從 cookie 注入 Bearer。
interface Session {
  user: AuthUser;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession 必須在 SessionProvider（authed）內使用');
  }
  return value;
}

interface SessionState {
  status: StatusKind | 'authed';
  user?: AuthUser;
  message?: string;
  sub?: string | null;
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
        const user = await lineLogin(login.idToken);
        if (!cancelled) setState({ status: 'authed', user, sub: login.sub });
      } catch (e: unknown) {
        if (!cancelled) setState({ status: 'error', message: errorMessage(e) });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  if (state.status !== 'authed' || !state.user) {
    return (
      <StatusScreen
        status={state.status === 'authed' ? 'loading' : state.status}
        message={state.message}
        sub={state.sub}
      />
    );
  }

  return <SessionContext.Provider value={{ user: state.user }}>{children}</SessionContext.Provider>;
}
