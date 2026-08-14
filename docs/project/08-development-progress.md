# Sproutin Development Progress

> **這份是 Human Owner 的主要「持續跟讀」文件。** 只回答：現在在哪裡？完成什麼？還缺什麼？誰要做什麼？下一步是什麼？
> 它是**導航**，不是 Source of Truth。真正的真相在：Architecture → `docs/00-09` + `docs/adr/`；Project Control → `docs/project/`。
> Last updated: 2026-08-14（Phase 6 Step 1 IMPLEMENTED）

---

## Current Position

**Phase:**
Phase 6 — Vertical Slice（**進行中**）。Phase 5 已 ACCEPTED（2026-08-14, Human Owner）。

**Milestone:**
Phase 6 / **Step 1 — DB migration + seed**：`VERIFICATION_PENDING`（CI 綠 + 線上已套用 + 線上 seed 成功）→ **只差 Human Acceptance**

**Status:**
```text
Phase 5:  ✅ ACCEPTED（2026-08-14）— Frontend / API / Worker / Redis / PostgreSQL / CI / Web→API 全綠
Phase 6:  🟡 IN PROGRESS
  Step 1 DB migration + seed         → IMPLEMENTED（待 CI + 線上 + 驗收）
  Step 2 LINE / LIFF 登入骨架         → NOT_STARTED（卡 Human Owner LINE 憑證）
  Step 3 RBAC 骨架                    → NOT_STARTED
  Step 4 端到端讀取切片                → NOT_STARTED
```

---

## Current Objective

Phase 6 Step 1：建立**第一版 DB schema（baseline migration）**與**一間 Demo School 的 synthetic seed**，
並以 **CI（拋棄式 Postgres）** 證明 migration 可套用、seed 可重入、資料圖符合 RBAC/ADR-002；
線上經 Render preDeploy 自動 migrate + 一次性 seed job 落地。（**不含** LINE 登入 / RBAC guard / 任何讀取 API — 那些是 Step 2–4。）

---

## Current Task

Phase 6 / Step 1 — DB migration + seed：

```text
[x] Baseline migration 0001_init（17 tables/11 enums/13 FK/11 index；純 Expand，ADR-003）
[x] Idempotent synthetic seed（seed.ts；SEED_DEMO guard）— 身分/就學圖 + demo 業務資料（含 ADR-002 override 情境）
[x] CI 斷言 verify.ts（家長只見自己小孩 / 老師只見自班 / override source=MANUAL 保留血緣）
[x] render.yaml preDeployCommand: migrate:deploy（僅 api，自動套用 migration）
[x] CI DB job（postgres:16）：migrate deploy → seed×2 → verify → drift check
[x] 本機驗證：prisma validate ✓、committed migration == 重新產生（無 drift）✓、seed/verify typecheck ✓
[x] CI DB job 綠燈（run 31772685822）：migrate → seed×2 → verify（12 斷言全過）→ drift ✓
[x] Render 線上 migrate（preDeploy 自動）：0001_init applied ✓
[x] Render 線上 seed one-off job：counts 全數符合（school1/class2/student5/user6/…/attendance3/announcement2）✓
[ ] Human Owner acceptance（Step 1）              — 待 Human Owner
```

Step 1 技術項目全數綠（CI + 線上）；**僅剩 Human Owner Acceptance**。

---

## Completed

```text
[x] Phase 0–4（Product / Stack / Architecture / Domain-DB-RBAC-Event-API / Architecture Gate）— ACCEPTED
[x] Architecture v1.1 clarifications ×3 — ACCEPTED
[x] ADR-001 ~ ADR-005 — ACCEPTED
[x] Project Control Documentation（docs/project/00-08）— ACCEPTED
[x] Project Skeleton — Frontend（Vercel web）— ACCEPTED（2026-08-14）
[x] CI green（install/db:generate/typecheck/test/build）— VERIFIED
[~] Project Skeleton — Backend deployment config（Render）— IMPLEMENTED（待 Human Owner 部署驗證）
[x] AQ-1 / AQ-2 部署決策 — DECIDED（ADR-006：Vercel + Render）
```

> `[~] IMPLEMENTED` 代表 code 已寫，**不等於 Human Acceptance**。

---

## Verification Pending

> Human Owner 不使用本機開發環境；以下由 **CI / Vercel Preview / Online** 自動或線上驗證，**不要求 Human Owner 跑 localhost**。

```text
[x] pnpm install / dependency installation      → CI ✅ VERIFIED
[x] Prisma generate                              → CI ✅
[x] Typecheck                                    → CI ✅
[x] Automated tests                              → CI ✅
[x] Build（api nest build + web next build）      → CI ✅
[x] CI green                                       → CI ✅（run 31732797734）
[x] Vercel（web）Production deployed               → Vercel ✅
[x] Web loads                                       → Online ✅
[x] Runtime Config（web /api/public-config）        → Online ✅
[x] Secret exposure（web，無 API_INTERNAL_URL/secret）→ Online ✅
[ ] /health                                          → BLOCKED：API 未部署（AQ-2）
[ ] /config/public（後端 API）                        → BLOCKED：API 未部署（AQ-2）
```

剩餘僅 `/health`、`/config/public`（後端 API 端點）+ Human Owner 正式驗收。

---

## In Progress

- Backend deployment（Render）：Claude 設定已完成（IMPLEMENTED）；等 Human Owner 於 Render 以 `render.yaml` Blueprint 部署 → 一起線上驗證。

---

## Blocked

```text
BLOCKED: (soft) 後端線上驗證尚未能開始

Reason:
Render 部署設定（render.yaml / Dockerfile / main.ts / worker.ts）已備；尚待 Human Owner 於 Render 部署。

Waiting for:
Human Owner（建 Render 帳號 + 連接 GitHub + Blueprint 部署）

Required decision:
無（決策已於 ADR-006 定案）。
```

（非架構性硬阻塞；純平台部署接線。）

---

## Technical Debt

```text
1. ESLint flat config
   - Priority: Medium
   - Required before: Phase 8 — MVP Release Candidate（R7）
   - Owner: Claude(impl) / Human(accept)
   - Note: 目前 CI 暫略 lint；不得因換 Phase 而遺忘。
```

---

## Architecture Questions

```text
AQ-1 — Worker / BullMQ Production Hosting   → DECIDED（2026-08-14, ADR-006）
AQ-2 — API (NestJS) Production Hosting      → DECIDED（2026-08-14, ADR-006）

決策：架構不變，僅定部署位置——
  Vercel: Web ｜ Render: API + Worker ｜ Managed Redis（Render Key Value）｜ Managed PostgreSQL
詳見 docs/adr/ADR-006-deployment-hosting.md。

目前無待決 Architecture Question（None open）。
```

---

## Human Owner Action Required

```text
DONE
- Phase 5 全綠並驗收（Vercel + Render + CI + Web→API）；AQ-1/AQ-2 → ADR-006

NOW（Step 1 技術全綠，只差驗收）
- ✅ CI db job 綠（run 31772685822）｜✅ 線上 migrate 0001_init applied｜✅ 線上 seed counts 正確
- 👉 **給 Phase 6 Step 1 正式 Acceptance**（唯一待辦）

LATER（Step 2 才需要）
- LINE Developers / LINE OA / LIFF application / Channel 設定；於 Render/Vercel 填 LINE env
- online test accounts（真實 LINE，見 05-human-preparation §6）
```

---

## Next Task

```text
Phase 6 Step 1 收尾：CI DB job 綠燈 → Render 線上 migrate（preDeploy 自動）+ seed one-off job
→ Human Acceptance（Step 1）。通過後才進 Step 2（LINE / LIFF 登入骨架，卡 Human Owner LINE 憑證）。
```

（Claude 不自行跳 Step 2；Step 2 本身也需 Human Owner 備妥 LINE 憑證。）

---

## Next Acceptance Gate

```text
Phase 6 — Step 1 Acceptance Gate（DB migration + seed）
[x] Baseline migration 0001_init 產出且與 schema 無 drift（本機驗證）
[x] seed.ts idempotent + SEED_DEMO guard；verify.ts 斷言（RBAC / ADR-002）
[x] render.yaml preDeploy migrate:deploy；CI DB job（postgres:16）
[x] CI「db」job 綠燈（migrate → seed×2 → verify → drift）— run 31772685822
[x] Render：preDeploy migrate 套用（部署日誌「0001_init applied」）
[x] Render：seed one-off job 完成（counts 全數符合）
[ ] Human Owner acceptance（Step 1）
→ 驗收通過後 Step 1 標 ACCEPTED，才進 Step 2。

---

Phase 5 Backend Acceptance Gate（已完成，保留紀錄）

Frontend（已達成）
[x] Vercel Web deployed / loads
[x] Runtime Config verified（/api/public-config）
[x] No secret exposure（web）
[x] CI green

Backend（Render 部署 2026-08-14，已驗證）
[x] API 可啟動（sproutin-api Live, https://sproutin-api.onrender.com）
[x] /health 可訪問（{"status":"ok"}）
[x] /config/public 可正常工作（無 secret）
[x] Web → API communication（Vercel API_INTERNAL_URL → Render；schoolSlug="dev" 來自後端）
[x] API → PostgreSQL 正常（app 啟動 = $connect 成功）
[x] Worker → Redis 正常（log: ready — connected to Redis）
[x] Worker 可取得並處理測試 job（log: self-test OK — job ping completed）
[x] Secret 未暴露給 client
[x] Render deployment 正常（4 resource 全綠）
[x] Online verification 通過（/health、/config/public）
[x] Human Owner acceptance ✅（2026-08-14）— Phase 5 ACCEPTED
```

前端已 ACCEPTED；後端各項待 Render 部署後線上驗證，全部符合 + Human Owner acceptance 後，`Phase 5` 整體才標 `ACCEPTED`，才進 Phase 6。

---

## Latest CI

```text
Commit:  37a60da（ci: fix pnpm version conflict）
Run:     31732797734
Status:  ✅ SUCCESS（install / db:generate / typecheck / test / build 全綠）
Date:    2026-08-14
Note:    僅 Node 20 deprecation 警告（非致命）
```

---

## Latest Vercel Preview

```text
Deployment:  https://sproutin-kb91-theta.vercel.app （apps/web, Production）
Status:      Ready — Web availability / Runtime Config / Secret-exposure VERIFIED
Date:        2026-08-14
Note:        僅前端 web；後端 API 部署於 Render（render.yaml），待部署驗證
```

---

## Latest Accepted Commit

```text
Phase 5 — ACCEPTED（2026-08-14, Human Owner）
  含：Frontend(Vercel) + Backend API/Worker(Render) + Redis + PostgreSQL + CI + Web→API
  全數線上驗證通過。ref commit ~6ba52a9（main）。
Next: Phase 6 — Vertical Slice（於新 session 啟動）
```

---

## Recent Work Log

### 2026-08-14 — Phase 6 / Step 1 — DB migration + seed（IMPLEMENTED）

Completed:
- Baseline migration `0001_init`（由 `prisma migrate diff --from-empty` 產生：17 tables / 11 enums / 13 FK / 11 index；純 Expand，ADR-003；`migration_lock.toml`）
- Idempotent synthetic seed `packages/db/prisma/seed.ts`（固定 id upsert；`SEED_DEMO`/`SCHOOL_SLUG=dev` guard）：
  1 School+Config、2 Class、5 Student、6 User+LineIdentity（LINE ID 僅認證佔位）、UserRole、Guardianship（家長多小孩跨班 + 同一小孩多監護人）、TeacherAssignment；
  demo 業務資料：Leave×2（含 ADR-002 override 情境）、Attendance×3（LEAVE_EVENT / MANUAL-override 保留血緣 / 純手動）、Announcement×2
- CI 斷言 `verify.ts`；`render.yaml` `sproutin-api` 加 `preDeployCommand: migrate:deploy`；`.github/workflows/ci.yml` 新增 `db` job（postgres:16 → migrate deploy → seed×2 → verify → drift check）
- 依 Human Owner 3 項決定：migration 機制=Render preDeploy（自動）；seed 範圍=身分/就學圖 + demo 業務資料；套用=CI + 之後也 seed Render dev DB

Verification:
- 本機：`prisma validate` ✓；committed migration == 重新產生（無 drift）✓；`seed.ts`/`verify.ts` typecheck ✓
- CI（run 31772685822）：db job 全綠 — migrate deploy → seed×2（idempotent）→ verify（12 斷言全過）→ drift ✓
- 線上：Render preDeploy 自動 migrate `0001_init applied` ✓；seed one-off job counts 全數符合
  （school1/schoolConfig1/class2/student5/user6/lineIdentity6/userRole6/guardianship3/teacherAssignment2/leave2/attendance3/announcement2）✓
- 僅剩 Human Owner Acceptance（Claude 不自行標 ACCEPTED）

Issues:
- Problem: 本機無 Docker/Postgres、無法跑實際 migrate/seed。Cause: 開發機環境。Solution: 以 CI 拋棄式 postgres:16 為權威驗證 + 本機 drift/typecheck。Trade-off: 實際套用結果須看 CI/線上日誌。

Architecture:
- 無變更。新增部署機制（Render preDeploy migrate:deploy）屬 ADR-006 部署邊界內；ADR-005 AuditLog append-only DB-層 REVOKE 延至 Phase 7（需 app-role 分離）。

Human Owner:
- NOW：確認 CI `db` job 綠 → Render preDeploy migrate 自動套用 → 跑一次 seed one-off job（`pnpm db:seed`, `SEED_DEMO=true`）→ 回報 → Step 1 acceptance

Next:
- Step 1 acceptance → Step 2（LINE / LIFF 登入骨架，卡 Human Owner LINE 憑證）

### 2026-08-14 — Phase 5 ACCEPTED（Human Owner 驗收通過）

Completed:
- Human Owner 正式驗收 Phase 5：Frontend + Backend API + Worker + Redis + PostgreSQL + CI + Web→API 全數通過
- Phase 5 標記為 ACCEPTED

Next:
- Phase 6 — Vertical Slice（LINE Login → User → Student → 權限 → LIFF Dashboard），於新 session 啟動
- 序列：DB migration + seed → LINE/LIFF 登入骨架 → RBAC 骨架 → 端到端讀取切片

### 2026-08-14 — Phase 5 / Web→API 接通驗證通過

Completed:
- Human Owner 於 Vercel 設 API_INTERNAL_URL=https://sproutin-api.onrender.com + SCHOOL_SLUG=vercel-fallback(標記) + Redeploy
- （Claude 無法操作 Vercel：瀏覽器政策擋 vercel.com；改由 Human Owner 執行，Claude 給步驟 + 驗證）

Verification:
- GET web /api/public-config → schoolSlug="dev"（後端值，非 fallback）→ Web→API 溝通 VERIFIED ✅
- Phase 5 技術項目全數通過；僅剩 Human Owner Acceptance

Issues:
- Problem: claude-in-chrome 無法導航 vercel.com（政策）。Solution: 提供精確步驟由 Human Owner 執行，Claude 負責結果驗證。

Architecture:
- 無變更。

Human Owner:
- NOW：給 Phase 5 正式 Acceptance（技術全綠）

Next:
- Human Acceptance → Phase 5 完成 → Phase 6（Claude 不自行進入）

### 2026-08-14 — Phase 5 / Render 後端部署上線 + 驗證通過

Completed:
- Human Owner 於 Render Apply Blueprint「sproutin」（Claude 以瀏覽器協助導航，Human 綁卡 + 按 Deploy）
- 建立 4 resource（全 Singapore）：sproutin-db、sproutin-redis、sproutin-api(Starter)、sproutin-worker(Starter)；估價 US$14/月
- API Live：https://sproutin-api.onrender.com

Verification（線上，實測）:
- /health → {"status":"ok"} ✅
- /config/public → 正確 PublicConfig，無 secret / 無 API_INTERNAL_URL ✅
- API → PostgreSQL：app 成功啟動（Prisma $connect 成功）✅
- Worker log：ready — connected to Redis；processed job ping；self-test OK ✅
- Render deployment：4 resource 全綠 ✅

Issues:
- Blueprint 需付費（worker Starter 必付費）→ Human Owner 綁卡。Prisma on Alpine 正常（openssl 生效）。

Architecture:
- 無變更（部署位置 ADR-006）。

Human Owner:
- NEXT：於 Vercel 設 API_INTERNAL_URL=https://sproutin-api.onrender.com（Web→API）；給 Phase 5 正式 Acceptance

Next:
- Web→API 佈線 + Human Acceptance → Phase 5 完成 → Phase 6

### 2026-08-14 — Phase 5 / render.yaml TEST/DEV 標記 + 結構性驗證 PASS

Completed:
- `sproutin-redis` / `sproutin-db` 的 `plan: free` 明確標記 **TEST/DEV ONLY，非 production**（render.yaml 註解 + ADR-006）
- 結構性驗證（pyyaml + Render Blueprint schema 檢查）：**PASS，0 error / 0 warning**
  - services: web(sproutin-api) / worker(sproutin-worker) / keyvalue(sproutin-redis)；databases: sproutin-db
  - region 全 singapore；fromDatabase→sproutin-db、fromService→sproutin-redis 交叉引用正確；keyvalue noeviction；web healthCheckPath；worker dockerCommand

Verification:
- YAML 語法 + 結構 schema：PASS（本地）。**注意**：機器無 Render 官方 CLI，最終權威驗證為 Render Apply 前的 Blueprint preview。**未 Apply / Deploy。**

Issues:
- Problem: 無法在本地跑 Render 官方 validator。Solution: 以 pyyaml 解析 + 依 Blueprint 規格逐項檢查 + 交叉引用；並提示以 Render Blueprint preview 做最終確認。

Architecture:
- 無變更。

Human Owner:
- NOW：刪除手動空 DB/Redis → Apply（Render preview 為最終驗證）

Next:
- Apply → 後端線上驗證

### 2026-08-14 — Phase 5 / render.yaml 改為 Blueprint 統一建立全部資源

Completed:
- Human Owner 決定刪除手動建立、無資料的 Postgres/Key Value，改由 Blueprint 統一管理
- `render.yaml` 重寫：建立 4 個 resource（api / worker / keyvalue `noeviction` / postgres），全部 region=singapore；
  api+worker 以 fromDatabase / fromService 自動取得 DATABASE_URL / REDIS_URL（server-only，不暴露 client）
- 文件同步：ADR-006（改為統一管理）、05（步驟）、02、07、08

Verification:
- 無 code 變更（僅 render.yaml + 文件）；CI 不受影響。**未 Apply / Deploy**（依 Human Owner 指示）。

Issues:
- Problem: 上一版為「引用既有資源」；Human Owner 改為由 Blueprint 統一建立。
  Solution: 移除 Environment Group、恢復 databases:/keyvalue: 宣告 + fromDatabase/fromService。
  Trade-off: Human Owner 需先刪除手動空資源；換得單一來源、Apply 即全自動接線。

Architecture:
- 無變更。ADR-006 更新為「Blueprint 統一管理」。

Human Owner:
- NOW：刪除手動空 DB/Redis → 確認 render.yaml → Apply

Next:
- Apply → 後端線上驗證 → Phase 5 acceptance

### 2026-08-14 — Phase 5 / render.yaml 改為引用既有 Render 資源

Completed:
- Human Owner 已手動建立 Postgres + Key Value；為避免重複建立，`render.yaml` 改為：
  只宣告 api + worker，移除 databases: 與 keyvalue:；DATABASE_URL/REDIS_URL 走
  Environment Group `sproutin-backend`（sync:false，Human Owner 後台填既有資源 Internal URL）
- 文件同步：ADR-006（既有資源引用註記）、05（步驟改寫）、02、07、08

Verification:
- 無 code 變更（僅 render.yaml + 文件）；CI 不受影響。**未 Apply / Deploy**（依 Human Owner 指示）。

Issues:
- Problem: 原 render.yaml 宣告 databases/keyvalue → Apply 會重複建立既有資源。
  Cause: Render fromDatabase/fromService 僅能引用同 Blueprint 內資源。
  Solution: 移除資源宣告，改用 Environment Group（sync:false）引用既有資源。
  Trade-off: Human Owner 需於後台填 2 個連線字串一次（安全、無重複）。

Architecture:
- 無變更（仍 API+Worker+Redis+PostgreSQL）。ADR-006 補既有資源引用註記。

Human Owner:
- NOW：設 noeviction、確認 region、Apply（確認後）、填 Environment Group 連線字串

Next:
- 確認 render.yaml → Apply → 後端線上驗證

### 2026-08-14 — Phase 5 / 後端部署決策 + Render 設定（ADR-006）

Completed:
- Human Owner 正式決策 AQ-1/AQ-2 → ADR-006（Vercel: Web｜Render: API+Worker｜Managed Redis｜Managed PostgreSQL）；架構不變
- Frontend Phase 5 = ACCEPTED（Human Owner）
- 部署設定：`render.yaml`（api web service + worker + Key Value + Postgres）
- Docker：Dockerfile.api 加 openssl（Prisma on Alpine）
- 部署必要修正：main.ts 綁 PORT/0.0.0.0；worker.ts 加 Redis 連線 + self-test ping job（非業務邏輯）
- 文件：ADR-006、docs/09 部署位置、05-human-preparation（env 清單 + 部署分工 + PG/Redis 說明）

Verification:
- 待 CI（本次程式變更需 typecheck/build 綠）；後端線上驗證待 Human Owner 於 Render 部署

Issues:
- Problem: Render web service 需綁 $PORT/0.0.0.0；Prisma on Alpine 需 openssl。Solution: main.ts + Dockerfile 修正。

Architecture:
- 無變更（僅定部署位置，ADR-006）。AQ-1/AQ-2 關閉。

Human Owner:
- NOW：建 Render 帳號 + 連 GitHub + Blueprint 部署

Next:
- Render 部署 → 後端線上驗證 → Phase 5 acceptance

### 2026-08-14 — Phase 5 / CI 綠燈

Completed:
- 修正 CI pnpm 版本衝突（移除 workflow 重複的 version，改讀 packageManager）
- CI run 31732797734 全綠：install / db:generate / typecheck / test / build

Verification:
- ✅ 骨架程式碼實際可編譯 / 可建置 / 測試通過（解決先前「未驗證」疑慮）

Issues:
- Problem: 首三次 CI 於 pnpm setup 即失敗（版本重複指定）。Solution: workflow 移除 `version: 9`。

Architecture:
- 無變更。

Human Owner:
- NOW：決定 API+Worker 部署平台（AQ-1+AQ-2）以完成 /health、/config/public 驗證

Next:
- （待決定後）部署 API → 驗證 /health、/config/public → Phase 5 acceptance

### 2026-08-14 — Phase 5 / Vercel Web 上線 + 線上驗證（前端）

Completed:
- apps/web 部署至 Vercel Production：https://sproutin-kb91-theta.vercel.app
- 線上驗證（前端）：Web 首頁載入 ✅、`/api/public-config` 回傳正確 ✅、無 secret/內部 URL 外洩 ✅

Verification:
- VERIFIED（web 三項）；`/health`、`/config/public`（後端 API）仍 PENDING — API 未部署

Issues:
- Problem: Phase 5 Gate 含 /health、/config/public，但那是後端 API 端點，本次僅部署前端。
  → 需先決定 API 部署目標（新增 AQ-2）。

Architecture:
- 新增 AQ-2（API production hosting，與 AQ-1 同類，DEFERRED）。Claude 不自行決定部署架構。

Human Owner:
- NOW：決定 API + Worker 部署平台（AQ-1 + AQ-2）

Next:
- 依決定部署 API → 驗證 /health、/config/public → Phase 5 acceptance

### 2026-08-14 — Phase 5 / Git 上線 + lockfile

Completed:
- git init + 首次 commit + push 至 `github.com/Maderfacar/sproutin`（main）
- 產生並推送 `pnpm-lock.yaml`（供 CI `--frozen-lockfile` 與 Vercel 建置）
- 公開倉庫機密檢查通過（無 .env / 無憑證；僅 .env.example 佔位字）

Verification:
- 尚未：CI 首次執行、Vercel Preview、Online（等 Human Owner 接 Vercel）

Issues:
- Problem: 初始無 lockfile → CI/Vercel 會失敗。Solution: `pnpm install --lockfile-only` 產生並推送。

Architecture:
- 無變更。AQ-1 維持 DEFERRED。

Human Owner:
- NOW：Vercel import repo → Root Directory 設 `apps/web` → Framework = Next.js

Next:
- CI 綠燈 + Vercel Preview + Online 驗證（Phase 5 Acceptance）

### 2026-08-11 — Phase 5 / Project Control & Progress System

Completed:
- 建立 `docs/project/08-development-progress.md`（本文件，持續跟讀導航）
- （前置）建立 `docs/project/00-07` Project Control Documentation
- （前置）Phase 5 skeleton 已 IMPLEMENTED（NestJS/Next.js/Worker/Prisma/Docker/CI/Test、/health、/config/public）

Verification:
- 無新驗證。Phase 5 skeleton 仍 VERIFICATION_PENDING（CI/Preview/Online 未執行）

Issues:
- repository 未初始化 git → Phase 5 Verification 無法開始（soft blocked，待 Human Owner）

Architecture:
- 無新架構決策。AQ-1（Worker hosting）維持 DEFERRED

Human Owner:
- NOW：init git、建 GitHub repo、接 Vercel

Next:
- Phase 5 Verification（等 Human Owner 接線後執行）
```
