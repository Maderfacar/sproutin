import type { AuthUser } from '@sproutin/shared';

// 授權走 httpOnly cookie（同源自動帶）：登入端點設 cookie，之後 /me 等一律靠 cookie，前端不持有 token。

// LINE 登入：換發 Sproutin session（後端簽 JWT → route handler 設 httpOnly cookie）→ 回傳 user。
export async function lineLogin(idToken: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/line/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`login failed: ${res.status} ${detail}`);
  }
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

// 目前使用者（靠 cookie）。未登入 / cookie 失效 → 回 null（讓 SessionProvider 走 LINE 登入）。
export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch('/api/me', { cache: 'no-store', credentials: 'same-origin' });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`/me failed: ${res.status}`);
  }
  return (await res.json()) as AuthUser;
}

export interface StudentView {
  id: string;
  name: string;
  classId: string;
}

// 後端已依角色/scope 過濾（家長自己小孩 / 老師自班 / OWNER 全校）。
export async function fetchMyStudents(): Promise<StudentView[]> {
  const res = await fetch('/api/me/students', { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`/me/students failed: ${res.status}`);
  }
  return (await res.json()) as StudentView[];
}

// 登出：清 cookie。
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
}
