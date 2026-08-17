import type { PublicConfig } from '@sproutin/shared';

// 從 same-origin route handler 取得 public config（ADR-001）。
// 瀏覽器不需、也不得知道 API internal URL。
export async function loadPublicConfig(): Promise<PublicConfig> {
  const res = await fetch('/api/public-config', { cache: 'no-store' });
  if (res.status === 503) {
    // 後端暫時連不上（例如正在重新部署）—— 講成連線問題，不要讓人以為是設定壞了。
    throw new Error('暫時連不上伺服器，請稍後再試一次。');
  }
  if (!res.ok) {
    throw new Error(`failed to load public config: ${res.status}`);
  }
  return (await res.json()) as PublicConfig;
}
