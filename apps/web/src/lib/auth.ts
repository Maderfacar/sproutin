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
    throw new Error(`login failed: ${res.status}`);
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
