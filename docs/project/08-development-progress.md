# Sproutin Development Progress

> **這份是 Human Owner 的主要「持續跟讀」文件。** 只回答：現在在哪裡？完成什麼？還缺什麼？誰要做什麼？下一步是什麼？
> 它是**導航**，不是 Source of Truth。真正的真相在：Architecture → `docs/00-09` + `docs/adr/`；Project Control → `docs/project/`。
> Last updated: 2026-08-14

---

## Current Position

**Phase:**
Phase 5 — Backend Deployment Preparation / Verification

**Milestone:**
Backend（API + Worker）deployment config + verification

**Status:**
```text
Frontend: ACCEPTED（2026-08-14, Human Owner）
Backend:  IN_PROGRESS（Render 部署設定已備，待部署驗證）
Worker:   IN_PROGRESS（BullMQ 自我測試已備，待部署驗證）
Phase 6:  NOT_STARTED
```

---

## Current Objective

完成後端（NestJS API + BullMQ Worker）在 Render 的部署設定與驗證：
Web(Vercel) + API/Worker(Render) + Redis + PostgreSQL 全鏈路可線上驗證。
（Phase 5 收尾；**不含** LINE Login / RBAC / 任何 business feature。）

---

## Current Task

前端（Frontend）已 ACCEPTED；本階段聚焦後端部署設定：

```text
[x] Render Web Service 設定（API）        — IMPLEMENTED（render.yaml）
[x] Render Background Worker 設定          — IMPLEMENTED（render.yaml, start:worker）
[x] Docker / build 設定確認（+openssl）     — IMPLEMENTED
[x] API 埠綁定 PORT + 0.0.0.0              — IMPLEMENTED（main.ts）
[x] Worker Redis 連線 + 自我測試 ping job   — IMPLEMENTED（worker.ts；非業務邏輯）
[x] Redis 設定（Key Value, noeviction）    — IMPLEMENTED（render.yaml）
[x] PostgreSQL 設定（test/dev）            — IMPLEMENTED（render.yaml databases）
[x] Health check 設定（/health）           — IMPLEMENTED（render.yaml healthCheckPath）
[x] 環境變數清單                            — IMPLEMENTED（05-human-preparation）
[x] 部署文件（ADR-006 / docs/09）           — IMPLEMENTED
[ ] Human Owner：Render 部署 + 線上驗證     — 待 Human Owner
```

以上為 Claude 的部署**設定**（IMPLEMENTED）；實際部署與線上驗證由 Human Owner 執行。

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
- Git repo / GitHub / Vercel（web）已上線並驗證；AQ-1/AQ-2 已決策（ADR-006）

NOW
1. 建 Render 帳號 + 連接 GitHub
2. 以 render.yaml Blueprint 部署（Render 自動建 Postgres + Key Value）

NEXT
3. 與 Claude 一起線上驗證後端（/health、/config/public、API→PG、Worker→Redis）
4. Human Owner acceptance（Phase 5 收尾）

LATER
5. LINE Developers / LINE OA / LIFF（Phase 6）
6. 準備 demo data / online test accounts（見 05-human-preparation）
```

---

## Next Task

```text
Backend deployment verification（Human Owner 於 Render 部署 → Claude 協助線上驗證）
```

（不列 LINE Login / RBAC / Leave / Attendance —— 那些是 Phase 6 之後。）

---

## Next Acceptance Gate

```text
Phase 5 Backend Acceptance Gate

Frontend（已達成）
[x] Vercel Web deployed / loads
[x] Runtime Config verified（/api/public-config）
[x] No secret exposure（web）
[x] CI green

Backend（待 Render 部署後驗證）
[ ] API 可啟動（Render web service Live）
[ ] /health 可訪問
[ ] /config/public 可正常工作
[ ] Web → API communication 正常
[ ] API → PostgreSQL 正常（API 啟動即代表已 $connect）
[ ] Worker → Redis 正常
[ ] Worker 可取得並處理測試 job（self-test ping）
[ ] Secret 未暴露給 client
[ ] Render deployment 正常
[ ] Online verification 通過
[ ] Human Owner acceptance
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
Frontend acceptance: Phase 5 Frontend — ACCEPTED（2026-08-14, Human Owner）
                     Vercel web deployed + online verified（首頁 / runtime config / 無 secret）+ CI green
Backend:             尚未 acceptance（待 Render 部署驗證）
Phase 5 (整體):       尚未 ACCEPTED
```

---

## Recent Work Log

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
