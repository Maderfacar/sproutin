import type { AuthUser } from '@sproutin/shared';

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

// 走 same-origin proxy（/api/*），瀏覽器不需、也不得知道 API internal URL。
export async function lineLogin(idToken: string): Promise<LoginResult> {
  const res = await fetch('/api/auth/line/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`login failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as LoginResult;
}

export async function fetchMe(accessToken: string): Promise<AuthUser> {
  const res = await fetch('/api/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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
export async function fetchMyStudents(accessToken: string): Promise<StudentView[]> {
  const res = await fetch('/api/me/students', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`/me/students failed: ${res.status}`);
  }
  return (await res.json()) as StudentView[];
}
