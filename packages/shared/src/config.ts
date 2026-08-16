// 公開 Runtime Config 型別 (ADR-001)
// /config/public 與 /api/public-config 的回應形狀。
// **只含非機密值**；secret 永不出現於此型別。

export interface PublicConfig {
  schoolSlug: string;
  // branding
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  bannerUrl: string | null;
  // LINE / LIFF（公開，非機密）
  liffId: string | null;
  lineOaChannelId: string | null;
  lineOaBasicId: string | null;
  // 前端行為
  // apiBaseUrl：瀏覽器面 origin，通常為 same-origin（null）。
  // 絕不等於 API_INTERNAL_URL —— 後者是 server-only，永不出現在此型別/回應中。
  apiBaseUrl: string | null;
  featureFlags: Record<string, boolean>; // 僅 public 子集
  cardOrder: string[];
  leaveRequiresApproval: boolean;
  // per-school 版型/主題模板（Phase 8）
  theme: string; // 主題氛圍：warm | professional
  dashboardLayout: string; // Dashboard 版型：grid | list
}

// 園所設定（管理用）：GET/PATCH /school/config 的形狀。
// 與 PublicConfig 的差別：這是**園長/行政可編輯的欄位集合**，不含 schoolSlug/LIFF 等
// 由部署與 LINE 設定決定、不由園所自行修改的值（後者仍走 /config/public，ADR-001）。
export interface SchoolAdminConfig {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  bannerUrl: string | null;
  featureFlags: Record<string, boolean>;
  cardOrder: string[];
  leaveRequiresApproval: boolean;
  theme: string;
  dashboardLayout: string;
}
