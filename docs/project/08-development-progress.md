# Sproutin Development Progress

> **這份是 Human Owner 的主要「持續跟讀」文件。** 只回答：現在在哪裡？完成什麼？還缺什麼？誰要做什麼？下一步是什麼？
> 它是**導航**，不是 Source of Truth。真正的真相在：Architecture → `docs/00-09` + `docs/adr/`；Project Control → `docs/project/`。
> Last updated: 2026-08-11

---

## Current Position

**Phase:**
Phase 5 — Project Skeleton

**Milestone:**
Phase 5 Verification

**Status:**
🟡 VERIFICATION_PENDING

---

## Current Objective

驗證 Project Skeleton 可以經由 **Git → CI → Vercel Preview → Online environment** 正常運作。
（只針對 Phase 5，不含後續 roadmap。）

---

## Current Task

```text
[~] Git initialization       — IMPLEMENTED（已 init + commit + push 至 Maderfacar/sproutin）
[~] First commit             — IMPLEMENTED
[~] Push                     — IMPLEMENTED（含 pnpm-lock.yaml）
[~] Vercel Web 部署（apps/web, Next.js）— IMPLEMENTED（Production 上線）
[~] Web availability          — VERIFIED（首頁載入）
[~] Runtime Config /api/public-config — VERIFIED（回傳正確 PublicConfig）
[~] Secret exposure（web）     — VERIFIED（無 API_INTERNAL_URL / secret）
[ ] /health、/config/public   — BLOCKED：屬後端 API，尚未部署（見 AQ-2）
[ ] Human Owner acceptance
```

Web（前端）線上驗證通過；`/health`、`/config/public` 屬後端 API，需先決定 API 部署目標（AQ-2）。

---

## Completed

```text
[x] Phase 0–4（Product / Stack / Architecture / Domain-DB-RBAC-Event-API / Architecture Gate）— ACCEPTED
[x] Architecture v1.1 clarifications ×3 — ACCEPTED
[x] ADR-001 ~ ADR-005 — ACCEPTED
[x] Project Control Documentation（docs/project/00-07）— ACCEPTED
[~] Project Skeleton（Phase 5）— IMPLEMENTED / VERIFICATION_PENDING
```

> `[~] IMPLEMENTED` 代表 code 已寫，**不等於 Human Acceptance**。

---

## Verification Pending

> Human Owner 不使用本機開發環境；以下由 **CI / Vercel Preview / Online** 自動或線上驗證，**不要求 Human Owner 跑 localhost**。

```text
[ ] pnpm install / dependency installation      → CI
[ ] Prisma generate                              → CI
[ ] Typecheck                                    → CI
[ ] Automated tests                              → CI
[ ] Build                                         → CI
[ ] CI green                                       → CI
[ ] Vercel Preview deployed                        → Vercel
[ ] Web loads                                       → Online
[ ] /health                                          → Online
[ ] /config/public                                   → Online
[ ] Runtime Config（per-school 值 runtime 取得）      → Online
[ ] Secret exposure（bundle / public config / logs 無 secret、無 API_INTERNAL_URL） → Online + review
```

---

## In Progress

None.
（目前無主動進行中項目；等待 Human Owner 接 GitHub/Vercel 後啟動 Phase 5 Verification。）

---

## Blocked

```text
BLOCKED: (soft) Phase 5 Online 驗證尚未能開始

Reason:
git 已上線（已 push）；尚待 Vercel 連接與 CI 首次執行。

Waiting for:
Human Owner（Vercel import repo + 設 Root Directory = apps/web）

Required decision:
無（純環境接線）。
```

（git 初始化/commit/push 已完成；非架構性硬阻塞。）

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
AQ-1 — Worker / BullMQ Production Hosting vs Vercel

Question:
Worker/BullMQ 的 production hosting 該放哪？是否與 Human Owner 的 Vercel 偏好衝突？

Existing Decision:
部署 = Docker container set（Web / API / Worker / Redis），每校一組；
Worker 為長駐 BullMQ processor（ADR-005 / docs/04 / docs/09）。

Problem:
Human Owner 部署偏好為 Vercel（Git→Push→CI→Vercel→Online）。
Vercel serverless 不適合託管長駐 Worker 進程與持續性 BullMQ consumer。

Evidence:
BullMQ 需常駐 Node 進程消費 Redis 佇列（Outbox dispatch、LINE push、out-of-band audit）；
Vercel Functions 短生命、無常駐 worker；Cron 非佇列消費者。

Alternatives:
(a) Web(+可能 API) 置 Vercel，Worker + Redis 置長駐平台（Railway/Render/Fly/managed container）
(b) Web/API/Worker 全置容器平台（放棄 Vercel Preview DX）
(c) 改用 serverless 佇列取代 BullMQ（屬變更既有決策 ADR-005，不得自行決定）

Trade-offs:
(a) 保留 Vercel 前端 DX，但雙平台/雙部署目標
(b) 部署一致但失去 Vercel Preview
(c) 架構大改，未經審查不採

Recommendation:
保留 Worker + BullMQ + Redis 抽象不變；production 將 Worker + Redis 置長駐平台、Web 置 Vercel、API 擇一。不改佇列技術。

Decision Status:
DEFERRED — 等待 Human Owner / Architecture Review。Claude 不自行改。
```

```text
AQ-2 — API（NestJS）Production Hosting

Question:
後端 API 要部署到哪？（驗證 /health、/config/public 的前提）

Existing Decision:
docs/09：Docker container set（Web/API/Worker），API 為 NestJS。

Problem:
本次僅前端 web 上了 Vercel；API 尚未部署，故 /health、/config/public 無法線上驗證。
Human Owner 偏好 Vercel；NestJS modular monolith + 常駐 Prisma 連線在 Vercel serverless 上非最佳。

Alternatives:
(a) API 與 Worker 一起放長駐平台（Railway/Render/Fly/container），Web 留 Vercel
(b) API 以 serverless adapter 塞進 Vercel（Worker 仍需長駐，另放）
(c) 全部放容器平台

Trade-offs:
(a) 乾淨、與 docs/09 一致；雙平台。
(b) 省一個平台，但 NestJS on serverless 有冷啟動/連線池問題。
(c) 一致但失去 Vercel 前端 DX。

Recommendation:
與 AQ-1 一起決定：API + Worker + Redis 放同一長駐平台，Web 留 Vercel。等 Architecture Review。

Decision Status:
DEFERRED — 等待 Human Owner。
```

---

## Human Owner Action Required

```text
DONE
- Git repo / GitHub / Vercel（web）已完成並上線

NOW
1. 決定 API + Worker 的部署平台（AQ-1 + AQ-2）— 這是 /health、/config/public 能否線上驗證的前提
   （Claude 建議：API+Worker+Redis 放長駐平台，Web 留 Vercel）

NEXT
2. 依決定部署 API → 線上驗證 /health、/config/public → Human Owner acceptance（Phase 5 收尾）

LATER
3. LINE Developers / LINE OA setup
4. Managed PostgreSQL setup
5. Redis provider setup
6. 準備 demo data / online test accounts（見 05-human-preparation）
```

---

## Next Task

```text
Phase 5 Verification
```

（不列 DB Migration / LINE Login / RBAC / Leave / Attendance —— 那些是未來 Task。）

---

## Next Acceptance Gate

```text
Phase 5 Acceptance

[ ] Git repository initialized
[ ] Push successful
[ ] CI green
[ ] Vercel Preview deployed
[ ] Web loads
[ ] /health works
[ ] /config/public works
[ ] Runtime Config verified
[ ] No secret exposure
[ ] Human Owner acceptance
```

全部符合後，`Phase 5` 才可標記為 `ACCEPTED`，並進入 Phase 6 — Vertical Slice。

---

## Latest CI

```text
Not yet available
```

---

## Latest Vercel Preview

```text
Deployment:  https://sproutin-kb91-theta.vercel.app （apps/web, Production）
Status:      Ready — Web availability / Runtime Config / Secret-exposure VERIFIED
Date:        2026-08-14
Note:        僅前端 web；後端 API 未部署（/health、/config/public 待 AQ-2）
```

---

## Latest Accepted Commit

```text
Commit:     1b7b552（HEAD, main）— 尚未 Human Acceptance
Date:       2026-08-14
Purpose:    initial commit + pnpm-lock.yaml
Acceptance: None（等 Phase 5 Acceptance Gate）
```

---

## Recent Work Log

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
