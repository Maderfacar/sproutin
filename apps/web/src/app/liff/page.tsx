'use client';

import { useEffect, useState } from 'react';
import type { AuthUser } from '@sproutin/shared';
import { loadPublicConfig } from '../../lib/config';
import { ensureLiffLogin } from '../../lib/liff';
import { fetchMe, lineLogin } from '../../lib/auth';

type Phase = 'loading' | 'redirecting' | 'authed' | 'error';

// Phase 6 Step 2：LINE/LIFF 登入骨架。
// 流程：讀 public config 取 LIFF_ID → LIFF 登入取 idToken → 換 Sproutin JWT → GET /me 顯示。
// 這裡只證明認證鏈通；Dashboard 讀取切片是 Step 4。
export default function LiffLoginPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const config = await loadPublicConfig();
        if (!config.liffId) {
          throw new Error('liffId 未設定（/config/public）——請確認已 seed SchoolConfig.liffId');
        }

        const idToken = await ensureLiffLogin(config.liffId);
        if (idToken === null) {
          // 導向 LINE 登入中；返回後本頁會重新掛載。
          if (!cancelled) setPhase('redirecting');
          return;
        }

        const { accessToken } = await lineLogin(idToken);
        const me = await fetchMe(accessToken);
        if (!cancelled) {
          setUser(me);
          setPhase('authed');
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'login failed');
          setPhase('error');
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Sproutin — LIFF 登入</h1>
      {phase === 'loading' && <p>登入中…（初始化 LIFF）</p>}
      {phase === 'redirecting' && <p>導向 LINE 登入…</p>}
      {phase === 'error' && <p style={{ color: 'crimson' }}>登入失敗：{error}</p>}
      {phase === 'authed' && user && (
        <section>
          <p>
            已登入為 <strong>{user.displayName}</strong>
          </p>
          <p>
            角色：{user.roles.map((r) => r.role).join('、') || '（無角色）'}
          </p>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
