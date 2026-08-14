'use client';

import { useEffect, useState } from 'react';
import type { AuthUser } from '@sproutin/shared';
import { loadPublicConfig } from '../../lib/config';
import { ensureLiffLogin } from '../../lib/liff';
import { fetchMe, fetchMyStudents, lineLogin, type StudentView } from '../../lib/auth';

type Phase = 'loading' | 'redirecting' | 'authed' | 'error';

// Phase 6 Step 4：端到端讀取切片 Dashboard（最小）。
// LIFF 登入 → JWT → /me + /me/students（後端依角色/scope 過濾）→ 顯示可查看的學生。
// 家長只會拿到自己小孩、老師只拿到自班、園長拿到全校——過濾全在後端（Rule 5/6）。
export default function LiffDashboardPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<StudentView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const config = await loadPublicConfig();
        if (!config.liffId) {
          throw new Error('liffId 未設定（/config/public）——請確認已 seed SchoolConfig.liffId');
        }

        const login = await ensureLiffLogin(config.liffId);
        if (login === null) {
          if (!cancelled) setPhase('redirecting');
          return;
        }
        if (!cancelled) setSub(login.sub);

        const { accessToken } = await lineLogin(login.idToken);
        const [me, myStudents] = await Promise.all([
          fetchMe(accessToken),
          fetchMyStudents(accessToken),
        ]);
        if (!cancelled) {
          setUser(me);
          setStudents(myStudents);
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
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 560 }}>
      <h1>Sproutin</h1>

      {phase === 'loading' && <p>登入中…（初始化 LIFF）</p>}
      {phase === 'redirecting' && <p>導向 LINE 登入…</p>}

      {phase === 'error' && (
        <>
          <p style={{ color: 'crimson', wordBreak: 'break-all' }}>登入失敗：{error}</p>
          {sub && (
            <p style={{ background: '#f3f4f6', padding: 8, borderRadius: 6, wordBreak: 'break-all' }}>
              你的 LINE User ID（sub）：<strong>{sub}</strong>
            </p>
          )}
        </>
      )}

      {phase === 'authed' && user && (
        <section>
          <p>
            歡迎，<strong>{user.displayName}</strong>（{user.roles.map((r) => r.role).join('、') || '無角色'}）
          </p>
          <h2 style={{ fontSize: 18, marginTop: 24 }}>你可查看的學生（{students.length}）</h2>
          {students.length === 0 ? (
            <p style={{ color: '#6b7280' }}>目前沒有可查看的學生。</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {students.map((s) => (
                <li
                  key={s.id}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <strong>{s.name}</strong>
                  <span style={{ color: '#6b7280', marginLeft: 8 }}>班級：{s.classId}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
