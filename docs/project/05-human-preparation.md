# 05 — Human Owner Preparation

> **嚴禁把真正 secret 寫入 repository。** 本文件只列「需要哪些變數 / 帳號 / 資料」，不含任何真值。
> 部署位置已定案（ADR-006）：Vercel（Web）+ Render（API、Worker）+ Managed Redis + Managed PostgreSQL。

## 0. Deployment Boundary（部署分工，正式納入）

| 角色 | 負責 |
|------|------|
| **Human Owner** | 建立帳號、服務、Provider、Secrets；在平台上實際部署；線上驗證與**正式接受（Acceptance）** |
| **Claude** | deployment configuration、Dockerfile、環境變數清單、CI/CD 設定、部署文件 |
| **ChatGPT / Architecture Review** | 重大 deployment architecture review 與風險判斷 |
| **Human Owner Acceptance** | 實際線上驗證後的正式接受（`ACCEPTED` 只有此步能給） |

## 1. Accounts

### NOW — Phase 5 後端部署
| 帳號 | 用途 |
|------|------|
| **Render** | 部署 API（web service）+ Worker（background worker） |
| **Render → 連接 GitHub** | 讓 Render 讀 `render.yaml` 藍圖自動部署 |
| **PostgreSQL（已手動建立）** | 後端資料庫（test/dev）。**已由 Human Owner 手動建立**；透過 Environment Group 提供 `DATABASE_URL`（Internal URL） |
| **Key Value / Redis（已手動建立）** | 佇列 / 背景工作。**已由 Human Owner 手動建立**；透過 Environment Group 提供 `REDIS_URL`（Internal URL）；需設 `maxmemory-policy=noeviction` |

> ⚠ **既有資源引用**：`render.yaml` **只建 api + worker**，**不建** DB/Redis（避免重複）。DB/Redis 連線字串由 Human Owner 於 Render 後台填入 Environment Group `sproutin-backend`。詳見 §7 與 ADR-006。

### LATER — Phase 6
- LINE Developers account
- LINE Official Account
- LIFF application
- LINE Channel configuration

## 2. Environment Variable Inventory（只列名稱與說明，無真值）

| 變數 | Purpose | Server-only / Client-visible | Required | Where to configure |
|------|---------|------------------------------|----------|--------------------|
| `DATABASE_URL` | 後端連 PostgreSQL | **Server-only（secret）** | **Now** | Render **Environment Group `sproutin-backend`**（貼既有 Postgres Internal URL） |
| `REDIS_URL` | 佇列 / BullMQ | **Server-only（secret）** | **Now** | Render **Environment Group `sproutin-backend`**（貼既有 Key Value Internal URL） |
| `JWT_SECRET` | JWT 簽章 | **Server-only（secret）** | **Now** | Render：`generateValue` 自動產生 |
| `SCHOOL_SLUG` | 本 instance 識別 | Server-only | **Now** | Render env（api，預設 `dev`） |
| `PORT` | 服務監聽埠 | Server-only | **Now** | Render 自動注入（API 已讀取） |
| `API_INTERNAL_URL` | web server → api 內部連線 | **Server-only（不得進 bundle / public config）** | **Now（web 端）** | Vercel env（server-only） |
| `LINE_CHANNEL_ID` | LINE channel 識別 | Server-only（非高敏） | **Later** | Render env（`sync:false`） |
| `LINE_CHANNEL_SECRET` | LINE 驗證 | **Server-only（secret）** | **Later** | Render env（`sync:false`） |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE push | **Server-only（secret）** | **Later** | Render env（`sync:false`） |
| `LIFF_ID` | LIFF app id（**公開**） | Client-visible（runtime，非 build-time） | **Later** | 該校 DB `SchoolConfig` → `/config/public` |

> 原則（ADR-001 / ADR-004）：public 值走 runtime `/config/public`；機密走平台 env / Secret Manager，**永不進 repo**。`API_INTERNAL_URL` 永不出現在 public config。

## 3. PostgreSQL（本階段需求）

- Project Skeleton 對 PostgreSQL 的需求：API 啟動時 `PrismaService` 會 `$connect()`；**只需能連線的空資料庫即可**（尚未跑 migration、不需任何 table）。故 `/health` 可訪問即代表 **API → PostgreSQL 連線成功**。
- Human Owner 現階段**只需準備一個 Managed PostgreSQL（test/dev）**。
- **不要現在建立大量 School production databases。** 正式的 Multi-Instance / DB-per-School 於後續 School Provisioning 階段依架構逐校建立。

## 4. Redis（本階段需求）

準備一個 **Managed Redis / Redis 相容服務**，確認：
- **connection URL**（`REDIS_URL`）
- **authentication**（密碼 / ACL）
- **TLS**（Render Key Value 內部連線通常免 TLS；外部服務可能需 `rediss://`）
- **BullMQ 相容性**：`maxmemory-policy = noeviction` —— 因採「既有資源引用」，`render.yaml` 不再管理此設定，**請於 Render 後台在既有 Key Value 上手動設定**；worker 連線已設 `maxRetriesPerRequest=null`。

> 選 Render **不會**改動既有 Queue 架構（仍是 BullMQ + Redis）。

## 5. Demo Data（未來準備，優先 synthetic）

> **MVP / development / online verification 優先使用 synthetic / demo data，不使用不必要的真實兒童資料。**

- [ ] Demo School（1 間）
- [ ] Demo Class（≥2 班，測 class isolation）
- [ ] Demo Admin / Teacher（班導 + 隨車）/ Parent（含一位家長對多小孩）/ Student（多名，跨班）
- [ ] Multiple Guardianship scenario（父/母/祖父母）
- [ ] Multiple Class scenario
- [ ] Permission test scenario（家長只見自己小孩、老師只見自班）
- [ ] Leave / Attendance test scenario（含 override 衝突，ADR-002）

## 6. Online Testing Accounts / Devices（Phase 6）

- [ ] Parent / Teacher / Admin test accounts（真實 LINE）
- [ ] LINE test accounts（≥2，測隔離）
- [ ] Mobile device（LIFF WebView）+ Desktop browser

## 7. 目前（Phase 5 後端）Human Owner 步驟 —（既有資源引用版）

> Human Owner 已手動建立 PostgreSQL + Key Value。`render.yaml` **只建 api + worker**，
> **不會**再建 DB/Redis；DATABASE_URL / REDIS_URL 走 Environment Group「sproutin-backend」。

1. **確認既有 Key Value 設定**：`maxmemory-policy = noeviction`（BullMQ 需求；Blueprint 不再管理此設定）。
2. **取得既有資源的 Internal 連線字串**：
   - Postgres → **Internal Database URL**
   - Key Value → **Internal URL**（`redis://...`）
3. **確認 region 一致**：`render.yaml` 的 api/worker region 需與既有 Postgres/Key Value 相同（預設 `singapore`，不同請先改 render.yaml）。
4. **Apply Blueprint**（建立 api + worker + 空的 Environment Group `sproutin-backend`）。
   - ⚠ 但**在 Claude 與你確認前，先不要 Apply**（依你的指示）。
5. **填入 Environment Group `sproutin-backend`**：`DATABASE_URL`=既有 Postgres Internal URL、`REDIS_URL`=既有 Key Value Internal URL。
6. 與 Claude 一起做後端線上驗證（見 [04-test-matrix §3b](./04-test-matrix.md)）。

**絕不**：刪除既有 Postgres / Key Value；建立第二套；改動 API+Worker+Redis+PostgreSQL 架構。
