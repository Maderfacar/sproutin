'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '@sproutin/shared';
import { ensureLiffLogin } from './liff';
import { lineLogin } from './auth';
import { StatusScreen, type StatusKind } from '../components/StatusScreen';

// 登入 session：LIFF 登入 → 換發 Sproutin JWT → 提供 { user, accessToken } 給子頁。
// 授權全在後端（Rule 5/6）；前端僅以 user.roles 決定顯示。
interface Session {
  user: AuthUser;
  accessToken: string;
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
  session?: Session;
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
        if (!liffId) {
          throw new Error('liffId 未設定（/config/public）——請確認已 seed SchoolConfig.liffId');
        }
        const login = await ensureLiffLogin(liffId);
        if (login === null) {
          if (!cancelled) setState({ status: 'redirecting' });
          return; // 導向 LINE 登入中，返回後本頁會重跑
        }
        const { accessToken, user } = await lineLogin(login.idToken);
        if (!cancelled) {
          setState({ status: 'authed', session: { user, accessToken }, sub: login.sub });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setState({ status: 'error', message: errorMessage(e) });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  if (state.status !== 'authed' || !state.session) {
    return (
      <StatusScreen
        status={state.status === 'authed' ? 'loading' : state.status}
        message={state.message}
        sub={state.sub}
      />
    );
  }

  return <SessionContext.Provider value={state.session}>{children}</SessionContext.Provider>;
}
