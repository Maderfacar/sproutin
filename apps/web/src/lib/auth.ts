import type { AuthUser } from '@sproutin/shared';

// 授權走 httpOnly cookie（同源自動帶）：登入端點設 cookie，之後 /me 等一律靠 cookie，前端不持有 token。

// 認證錯誤：保留後端的錯誤碼，讓呼叫端能區分「這個 LINE 還沒綁帳號」與其他失敗。
export class AuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = 'AuthError';
  }
}

async function toAuthError(res: Response): Promise<AuthError> {
  try {
    const data = (await res.json()) as {
      error?: { code?: string; message?: string };
      message?: unknown;
    };
    const code =
      data.error?.code ??
      data.error?.message ??
      (typeof data.message === 'string' ? data.message : undefined) ??
      `HTTP_${res.status}`;
    return new AuthError(res.status, code);
  } catch {
    return new AuthError(res.status, `HTTP_${res.status}`);
  }
}

// LINE 登入：換發 Sproutin session（後端簽 JWT → route handler 設 httpOnly cookie）→ 回傳 user。
export async function lineLogin(idToken: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/line/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw await toAuthError(res);
  }
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

// 綁定：輸入園所發的綁定碼 → 接上帳號並同時完成登入。
export async function lineBind(idToken: string, code: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/line/bind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, code }),
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw await toAuthError(res);
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
