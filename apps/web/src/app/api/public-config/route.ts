import { NextResponse } from 'next/server';
import type { PublicConfig } from '@sproutin/shared';

// same-origin Route Handler（ADR-001）：請求期讀伺服器 env，供瀏覽器取得 public config。
// 不在 build 時內嵌 per-school 值，故同一 web image 適用所有學校。
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  // API_INTERNAL_URL 為 server-only，永不回傳給瀏覽器（澄清 v1.1）。
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  const schoolSlug = process.env.SCHOOL_SLUG ?? 'dev';

  // 若已設定 API_INTERNAL_URL → 向後端取該校 public config（Web → API 溝通）。
  // 後端不可用時落回下方最小設定，不阻斷前端。
  if (apiInternalUrl) {
    try {
      const res = await fetch(`${apiInternalUrl}/config/public`, { cache: 'no-store' });
      if (res.ok) {
        const upstream = (await res.json()) as PublicConfig;
        return NextResponse.json(upstream);
      }
    } catch {
      // fall through to minimal config
    }
  }

  // Fallback：最小 public config，不含任何 secret / internal URL。
  const config: PublicConfig = {
    schoolSlug,
    brandName: 'Sproutin',
    logoUrl: null,
    primaryColor: '#2E7D32',
    secondaryColor: '#A5D6A7',
    bannerUrl: null,
    liffId: null,
    lineOaChannelId: null,
    lineOaBasicId: null,
    apiBaseUrl: null,
    featureFlags: {},
    cardOrder: [],
    leaveRequiresApproval: true,
  };

  return NextResponse.json(config);
}
