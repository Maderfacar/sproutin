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
[ ] Git initialization
[ ] First commit
[ ] Push
[ ] CI verification
[ ] Vercel Preview
[ ] Online verification（/health、/config/public、web loads）
```

尚無任一項進入 IMPLEMENTED/ACCEPTED（皆未開始執行；需 Human Owner 先接 GitHub/Vercel）。

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
BLOCKED: (soft) Phase 5 Verification 無法開始

Reason:
repository 尚未初始化 git；尚未連接 GitHub / Vercel / CI。

Waiting for:
Human Owner

Required decision:
git 初始化與首次 commit 方式；GitHub repo 與 Vercel 連線。
```

（非架構性硬阻塞；純環境接線。）

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

---

## Human Owner Action Required

```text
NOW
1. Initialize Git repository
2. Create GitHub repository
3. Connect Vercel

NEXT
4. Review AQ-1（Worker hosting）
5. Perform online verification（Phase 5 Acceptance Gate 各項）

LATER
6. LINE Developers / LINE OA setup
7. Managed PostgreSQL setup
8. Redis provider setup
9. 準備 demo data / online test accounts（見 05-human-preparation）
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
Not yet available
```

---

## Latest Accepted Commit

```text
Commit:     None（git 尚未初始化）
Date:       —
Purpose:    —
Acceptance: None
```

---

## Recent Work Log

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
