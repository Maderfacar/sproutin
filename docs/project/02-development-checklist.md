# 02 — Development Checklist

> **Status 值**：`NOT_STARTED` · `IN_PROGRESS` · `IMPLEMENTED` · `VERIFICATION_PENDING` · `ACCEPTED` · `BLOCKED` · `DEFERRED`
>
> **鐵則**：`[x]` / `ACCEPTED` 只代表 **Human Owner / Architecture Review 要求的驗收條件已滿足**。
> Claude 自己寫完 code **不得**把 Task 標成 ACCEPTED —— 最多標 `IMPLEMENTED` 或 `VERIFICATION_PENDING`。

---

## Phase 0–4（歷史階段）
- [x] Product Definition — **ACCEPTED**
- [x] Technology Stack — **ACCEPTED**
- [x] Architecture v1.1 — **ACCEPTED**
- [x] Domain/DB/RBAC/Event/API 文件 — **ACCEPTED**
- [x] Architecture Gate + ADR-001~005 — **ACCEPTED**

---

## Phase 5 — Project Skeleton  🟡

- [~] **Monorepo baseline**
    - [x] pnpm workspace + Turborepo
    - [x] packages/db · packages/shared · ops/control-plane · ops/deploy
  - **Acceptance Criteria**：CI `pnpm install` 綠燈。
  - **Deliverables**：`package.json`、`pnpm-workspace.yaml`、`turbo.json`、`tsconfig.base.json`。
  - **Testing**：CI install。 **Owner**：Claude(impl) / Human(accept)。 **Status**：`VERIFICATION_PENDING`

- [~] **NestJS API skeleton**
    - [x] main / app.module / PrismaService / PrismaModule
    - [x] `GET /health`
    - [x] `GET /config/public`（server-only runtime config，ADR-001）
  - **Acceptance Criteria**：typecheck/build 綠燈；Online `/health`、`/config/public` 回應正確。
  - **Deliverables**：`apps/api/src/**`、`tsconfig.json`、`nest-cli.json`。
  - **Testing**：CI typecheck/build；Online health/config。 **Status**：`VERIFICATION_PENDING`

- [~] **Next.js Web skeleton**
    - [x] layout / page / lib/config
    - [x] same-origin `/api/public-config` route handler（不暴露 API_INTERNAL_URL）
  - **Acceptance Criteria**：build 綠燈；Vercel Preview 首頁顯示 runtime public config。
  - **Deliverables**：`apps/web/src/**`、`next.config.mjs`、`tsconfig.json`。
  - **Testing**：CI build；Preview online。 **Status**：`VERIFICATION_PENDING`

- [~] **Prisma schema baseline**
    - [x] 各校 schema（Student/User/Leave/Attendance/Audit/Outbox…）
    - [x] Control Plane schema（secret refs + schemaVersion）
    - [x] 首次 `prisma migrate`（baseline `0001_init`）— 於 **Phase 6 Step 1** 完成
  - **Acceptance Criteria**：`pnpm db:generate` 成功；schema 對齊 [../03](../03-database-schema.md)。
  - **Testing**：CI db:generate。 **Status**：`VERIFICATION_PENDING`

- [~] **Worker / BullMQ entrypoint**
    - [x] `apps/api/src/worker.ts`（骨架 + `start:worker` script）
    - [ ] Outbox dispatcher / processors（**Phase 6+**）
  - **Note**：Production hosting 為 **Architecture Question**（見 [07](./07-current-status.md)）。 **Status**：`IMPLEMENTED`

- [~] **Docker baseline**
    - [x] Dockerfile.api / Dockerfile.web / docker-compose.school.yml（web/api/worker/redis；PG 為 Managed 外部）
  - **Status**：`IMPLEMENTED`（未於平台驗證）

- [~] **CI baseline**
    - [x] `.github/workflows/ci.yml`：install → db:generate → typecheck → test → build
    - [ ] lint（**Technical Debt**，見下）
  - **Acceptance Criteria**：CI 綠燈。 **Status**：`VERIFICATION_PENDING`

- [~] **Test baseline**
    - [x] jest.config + `health.controller.spec.ts`
  - **Acceptance Criteria**：CI test 綠燈。 **Status**：`VERIFICATION_PENDING`

- [x] **Frontend（Vercel web）** — CI 綠 + Vercel Production + online 驗證（首頁/runtime config/無 secret） **Status**：`ACCEPTED`（2026-08-14, Human Owner）

### Phase 5 — Backend Deployment（ADR-006：Render）

- [~] **部署決策** — AQ-1/AQ-2 → ADR-006（Vercel + Render） **Status**：`ACCEPTED`（Human Owner）
- [~] **Render 部署設定**
    - [x] `render.yaml`：**Blueprint 統一建立** api + worker + Key Value（noeviction）+ Postgres，全部 Singapore；api/worker 用 `fromDatabase`/`fromService` 自動取得 DATABASE_URL/REDIS_URL
    - [x] Dockerfile.api：加 openssl（Prisma on Alpine）
    - [x] main.ts：綁 `PORT` / `0.0.0.0`
    - [x] worker.ts：Redis 連線 + self-test ping job（非業務邏輯）
  - **Acceptance Criteria**：Render 部署 Live；/health、/config/public 可訪問；Worker→Redis 處理 test job。
  - **Note**：Human Owner 先刪除手動建立的空 DB/Redis，之後全由 Blueprint 建立（ADR-006）。
  - **Deliverables**：`render.yaml`、`ops/deploy/Dockerfile.api`、`apps/api/src/{main,worker}.ts`、`docs/adr/ADR-006`。
  - **Owner**：Claude(config) / Human(deploy+accept)。 **Status**：`IMPLEMENTED / VERIFICATION_PENDING`
- [ ] **環境變數清單** — `docs/project/05-human-preparation.md` **Status**：`IMPLEMENTED`
- [x] **Phase 5 Backend Acceptance（Human Owner）** — Render 部署 + /health + /config/public + API→PG + Worker→Redis + Web→API + 無 secret 外洩，全數線上驗證 **Status**：`ACCEPTED`（2026-08-14）
- [x] **Phase 5 整體** — Frontend + Backend + CI + Deployment + Online Verification **Status**：`ACCEPTED`（2026-08-14, Human Owner）

### Technical Debt（Phase 5 引入）
- [ ] **ESLint flat config** — `DEFERRED`；MVP Release Candidate（Phase 8）前必須完成，不得永久忽略。

---

## Phase 6 — Vertical Slice  🟡（進行中）

- [~] **Step 1 — DB migration + seed（Demo School）** — `IMPLEMENTED / VERIFICATION_PENDING`
    - [x] Baseline migration `0001_init`（17 tables / 11 enums / 13 FK / 11 index；純 Expand，ADR-003）
    - [x] Idempotent synthetic seed（`seed.ts`）：身分/就學圖（1 School+Config、2 Class、5 Student、6 User+LineIdentity、UserRole、Guardianship 多小孩跨班+多監護人、TeacherAssignment）+ demo 業務資料（Leave×2 含 ADR-002 override、Attendance×3、Announcement×2）；`SEED_DEMO` guard
    - [x] 線上 migration 機制：`render.yaml` `sproutin-api` `preDeployCommand: migrate:deploy`
    - [x] CI DB job（postgres:16）：migrate deploy → seed×2（idempotent）→ `verify`（RBAC/ADR-002 斷言）→ drift check
    - [ ] CI 綠燈（待 push 後 run）→ 線上 Render migrate（preDeploy 自動）+ seed one-off job → Human Acceptance
  - **Acceptance Criteria**：CI DB job 綠燈；Render 部署日誌顯示 migration applied；seed job 日誌顯示 counts；Human Owner acceptance。
  - **Deliverables**：`packages/db/prisma/migrations/0001_init/*`、`packages/db/prisma/{seed,verify}.ts`、`packages/db/{package.json,tsconfig.json}`、`render.yaml`、`.github/workflows/ci.yml`。
  - **Owner**：Claude(impl) / Human(deploy+accept)。 **Note**：AuditLog append-only DB-層 REVOKE（ADR-005）延至 Phase 7（需 app-role 分離）。
- [ ] Step 2 — LINE / LIFF 登入骨架 — `NOT_STARTED`（卡 Human Owner LINE 憑證）
- [ ] Step 3 — RBAC 骨架（RolesGuard + ScopeGuard）— `NOT_STARTED`
- [ ] Step 4 — 端到端讀取切片：LINE Login → User → Student → 權限 → LIFF Dashboard — `NOT_STARTED`
- **Acceptance**：Online 可驗證 + Human Acceptance。

## Phase 7 — Core MVP  ⬜
- [ ] Leave 狀態機 · Attendance · Leave/Attendance 衝突規則（ADR-002）— `NOT_STARTED`
- [ ] Message Center · Announcement · Notification / LINE Push — `NOT_STARTED`
- [ ] Audit（transactional + out-of-band durable path）— `NOT_STARTED`
- [ ] Dashboard · Branding · Feature Flag — `NOT_STARTED`

## Phase 8 — Integration / Hardening  ⬜
- [ ] 多校隔離 / secret exposure / 錯誤處理 / 效能 — `NOT_STARTED`
- [ ] **ESLint（清 Technical Debt）** — `NOT_STARTED`

## Phase 9–10 — Pilot / Production  ⬜  `NOT_STARTED`
## Phase 11+ — Future domains  ⬜  `DEFERRED`（需明確批准）
