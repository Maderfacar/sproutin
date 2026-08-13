# ADR-001 — Runtime Configuration & LIFF Multi-Instance

**Status:** Accepted (2026-08-11)

## Context

同一份 Build Artifact 需部署到 N 間學校 (§20)。每校有不同的 LIFF ID、LINE OA、branding、API URL、feature flags。

Next.js 的 `NEXT_PUBLIC_*` 變數在 **build 時**被靜態嵌入 frontend bundle。若把 per-school 值放進 `NEXT_PUBLIC_*`，就必須為每校重新 build 一份 image —— 違反「One Build Artifact」。

## Decision

採 **Runtime Configuration**，per-school 值一律**執行期**取得，bundle 內**零** per-school 值。

1. **Instance 如何識別自己**：每個 web/api container 就是一間學校（single-tenant multi-instance）。容器啟動時由 orchestrator 注入**伺服器端**（非 `NEXT_PUBLIC_`）runtime env：`SCHOOL_SLUG`、`API_INTERNAL_URL`。
2. **Runtime config 來源**：瀏覽器向 **same-origin** 的 Next.js Route Handler `GET /api/public-config` 取得公開設定；該 handler 於**請求期**讀伺服器 env 並向 API `GET /config/public` 取值。API 自該校 DB 的 `SchoolConfig` 讀取。→ bundle 不含任何 per-school 值，且避免「瀏覽器需先知道 API URL」的雞生蛋問題（走 same-origin）。
3. **可 runtime 注入**（公開、非機密）：`liffId`、LINE OA 公開 channel/basic id、branding（logo/色/名稱）、apiBaseUrl（公開）、public feature flags、cardOrder、`leaveRequiresApproval`（若前端需感知）。
4. **必須 build-time**：僅框架級、全校一致的常數（無 per-school 值）。
5. **同一 artifact 保證**：per-school 值皆 runtime 解析 → 同一 image 部署到所有學校，差異只在注入的 env 與該校 DB 的 SchoolConfig。
6. **LIFF per-school isolation**：LIFF 初始化在**取得 runtime config 後**於 client 端進行，用該校 `liffId`。各校為獨立 web origin（per-school 子網域）+ 各自 LIFF ID。
7. **Secret 隔離**：`/config/public` 與 `/api/public-config` **只回非機密值**。LINE Channel Secret、JWT Secret、DB 憑證等**永不**出現在任何 public config 或 bundle。
8. **Internal URL 隔離（澄清 v1.1）**：`API_INTERNAL_URL` 為 **server-only** runtime configuration，僅供 web server（route handler）內部連線 API 使用。瀏覽器已走 same-origin `/api/public-config`，**不需要**、也**不得**得知 internal API URL。`PublicConfig.apiBaseUrl` 只表達瀏覽器面 origin（通常 same-origin / null），**絕不**承載 `API_INTERNAL_URL`。

## Alternatives Considered

- **每校 build 一份 image（baked `NEXT_PUBLIC_*`）**：違反 One Build Artifact，image 數量與 CI 成本隨學校數線性膨脹。否決。
- **Edge/CDN 依 host 改寫 config**：增加基礎設施與 vendor 依賴，違反「不因未來可能而加基礎設施」。否決。
- **純 client 直接呼叫各校 API 絕對 URL**：需在 bundle 內知道 API URL（per-school），回到 baked 問題。以 same-origin route handler 解決。

## Consequences

- (+) 真正做到 One Build Artifact；新增學校零重新 build。
- (+) Secret 與 public config 邊界清晰。
- (−) 首屏需一次 runtime config 取得（可由 web server 於 SSR 注入 `window.__SPROUTIN_CONFIG__` 消除 flash）。
- 影響：`SchoolConfig` 增公開 LINE/LIFF/branding 欄位；API 增 `GET /config/public`；web 增 `/api/public-config` route handler 與 config loader。
