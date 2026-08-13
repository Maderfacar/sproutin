import type { PublicConfig } from '@sproutin/shared';

// 從 same-origin route handler 取得 public config（ADR-001）。
// 瀏覽器不需、也不得知道 API internal URL。
export async function loadPublicConfig(): Promise<PublicConfig> {
  const res = await fetch('/api/public-config', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`failed to load public config: ${res.status}`);
  }
  return (await res.json()) as PublicConfig;
}
