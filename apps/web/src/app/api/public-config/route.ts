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
  //
  // **後端連不上時回 503，不再沉默降級成「最小設定」。**
  // 原本的降級會回一份 liffId=null 的設定並帶 200，前端因此顯示「liffId 未設定，請確認已 seed」
  // —— 把一次暫時性的連線失敗（例如 API 正在重新部署）講成設定錯誤，害人去查根本沒壞的東西
  // （2026-08-17 實際踩到：點 LINE 圖文選單時 API 正在重啟）。
  if (apiInternalUrl) {
    try {
      const res = await fetch(`${apiInternalUrl}/config/public`, { cache: 'no-store' });
      if (res.ok) {
        const upstream = (await res.json()) as PublicConfig;
        return NextResponse.json(upstream);
      }
    } catch {
      // 落到下方的 503
    }
    return NextResponse.json(
      { success: false, error: { code: 'config_unavailable', message: 'config_unavailable' } },
      { status: 503 },
    );
  }

  // Fallback 只用於「根本沒接後端」的骨架/本機情境（API_INTERNAL_URL 未設定）。
  // 最小 public config，不含任何 secret / internal URL。
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
    theme: 'warm',
    dashboardLayout: 'grid',
  };

  return NextResponse.json(config);
}
