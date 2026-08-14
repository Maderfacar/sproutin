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
- [ ] **CI 未建置 Docker image**（Phase 7 Step 1 暴露）— Docker build context 與 CI 分歧的錯誤會逃過 CI（本次：Dockerfile 缺 `tsconfig.base.json` → 失去 strict → zod 推導 TS2345，只在 Render build 爆）。建議 CI 加 `docker build -f ops/deploy/Dockerfile.api .` job。`Priority: Medium`。

---

## Phase 6 — Vertical Slice  ✅（COMPLETE 2026-08-14, Human Owner）

- [x] **Step 1 — DB migration + seed（Demo School）** — `ACCEPTED`（2026-08-14, Human Owner）
    - [x] Baseline migration `0001_init`（17 tables / 11 enums / 13 FK / 11 index；純 Expand，ADR-003）
    - [x] Idempotent synthetic seed（`seed.ts`）：身分/就學圖（1 School+Config、2 Class、5 Student、6 User+LineIdentity、UserRole、Guardianship 多小孩跨班+多監護人、TeacherAssignment）+ demo 業務資料（Leave×2 含 ADR-002 override、Attendance×3、Announcement×2）；`SEED_DEMO` guard
    - [x] 線上 migration 機制：`render.yaml` `sproutin-api` `preDeployCommand: migrate:deploy`
    - [x] CI DB job（postgres:16）：migrate deploy → seed×2（idempotent）→ `verify`（RBAC/ADR-002 斷言）→ drift check
    - [x] CI 綠燈（run 31772685822）→ 線上 Render migrate `0001_init applied` + seed one-off job（counts 符合）✓ → 僅待 Human Acceptance
  - **Acceptance Criteria**：CI DB job 綠燈；Render 部署日誌顯示 migration applied；seed job 日誌顯示 counts；Human Owner acceptance。
  - **Deliverables**：`packages/db/prisma/migrations/0001_init/*`、`packages/db/prisma/{seed,verify}.ts`、`packages/db/{package.json,tsconfig.json}`、`render.yaml`、`.github/workflows/ci.yml`。
  - **Owner**：Claude(impl) / Human(deploy+accept)。 **Note**：AuditLog append-only DB-層 REVOKE（ADR-005）延至 Phase 7（需 app-role 分離）。
- [x] **Step 2 — LINE / LIFF 登入骨架** — `ACCEPTED`（2026-08-14, Human Owner）
    - [x] 後端 `AuthModule`：`LineVerifier`(LINE verify 端點)、`AuthService`(查 LineIdentity→User+roles、簽 JWT、未 provisioned→401)、`AuthController`(`POST /auth/line/login`、`GET /me`)、`JwtAuthGuard`
    - [x] `/config/public` 改讀 DB `SchoolConfig`（liffId 等公開值）
    - [x] 前端 `/liff` 登入頁 + same-origin proxy（`/api/auth/line/login`、`/api/me`；API_INTERNAL_URL 保持 server-only）
    - [x] seed：`SchoolConfig.liffId=2011106015-hbS1EASz`；`DEMO_OWNER_LINE_USER_ID` env 對映園長（真 ID 不進 repo）
    - [x] env 拆 `LINE_LOGIN_*` / `LINE_MESSAGING_*`（render.yaml + docs/05）
    - [x] 測試：auth.service（provisioned/未provisioned/token 無效/me）+ jwt guard；本機 typecheck/test/build 綠
    - [x] CI 綠燈（run 31777136725）→ 線上手機實測 PASS（真 LINE → 王園長 OWNER）→ 僅待 Human Acceptance
  - **Acceptance Criteria**：CI 綠；線上手機用真 LINE 登入 `/liff` 顯示「已登入為 王園長(OWNER)」；未 provisioned→401。
  - **Deliverables**：`apps/api/src/auth/**`、`apps/api/src/core/config/public-config.*`、`apps/web/src/app/liff/**`、`apps/web/src/app/api/{auth/line/login,me}/route.ts`、`apps/web/src/lib/{liff,auth}.ts`、`packages/db/prisma/seed.ts`、`render.yaml`。
  - **Owner**：Claude(impl) / Human(線上實測+accept)。 **Note**：Messaging channel secret/token 屬 Phase 7,本步未用。
- [x] **Step 3 — RBAC 骨架（RolesGuard + ScopeGuard）** — `ACCEPTED`（2026-08-14, Human Owner）
    - [x] `@Roles`/`@Scope` + `RolesGuard` + `ScopeGuard` + `ScopeResolver`（student）
    - [x] 示範端點 `GET /students/:id`（JwtAuthGuard → RolesGuard → ScopeGuard）
    - [x] 測試矩陣 21 tests（老師自班/他班、家長自己/他人、OWNER/ADMIN 全校）;本機 typecheck/test/build 綠
    - [ ] CI 綠 → Human Acceptance。DENIED audit 留 Phase 7（ADR-005 TODO）。
- [x] **Step 4 — 端到端讀取切片：LINE Login → User → Student → 權限 → LIFF Dashboard** — `ACCEPTED`（2026-08-14, Human Owner）
- **Phase 6 — Vertical Slice：✅ COMPLETE（2026-08-14, Human Owner）** — Step 1–4 全數 ACCEPTED;端到端線上驗收通過。
- **Acceptance**：Online 可驗證 + Human Acceptance。

## Phase 7 — Core MVP  🟡
- [~] **Step 1 — Leave 狀態機（+ 寫入端 Outbox + transactional audit）** — `IMPLEMENTED / VERIFICATION_PENDING`
    - [x] `LeavesService` 狀態機（PENDING/APPROVED/REJECTED/CANCELLED;config-driven `leaveRequiresApproval`;非法轉移→409 `LEAVE_INVALID_TRANSITION`）
    - [x] 每個狀態變更於**同一 `$transaction`** 寫 Leave + `OutboxEvent`（PENDING，Step 3 消費）+ `AuditLog`（transactional，ADR-005 類別一）
    - [x] 端點 `POST /leaves`、`GET /leaves?studentId=`、`PATCH /leaves/:id/status`、`PATCH /leaves/:id/cancel`（docs/07 §3-4）
    - [x] 授權：粗粒度 `@Roles`;資料列級於 service 用 `ScopeResolver`（新增 `canManageStudentClass`）—— 申請看 `canAccessStudent`、審核/staff 取消看 `canManageStudentClass`、家長取消限申請者本人
    - [x] `core/audit`（`AuditService.record(tx, entry)`，僅交易內同步寫入）
    - [x] 本機：typecheck ✓、jest 49 tests ✓（含 leaves 17 / audit 2 / scope-resolver +5）、nest build ✓、`node dist/main.js` DI boot ✓（LeavesModule + 4 routes mapped）;`app.module.spec` DI smoke test 已涵蓋 LeavesModule
    - [ ] CI 綠 → Render 線上四端點行為（含 409、Outbox/Audit 有列）→ Human Acceptance
  - **範圍界定（Human Owner 定案 A）**：本步含**寫入端** Outbox + transactional audit;**不含** Worker dispatcher（Step 3）、Attendance 投影（Step 2）、out-of-band DENIED/FAILURE audit + DB 層 append-only REVOKE + 稽核查詢端點（Step 6）。故 `LeaveApproved` 本步**尚不投影 Attendance**。
  - **無新 migration**（Leave/OutboxEvent/AuditLog + enum 已在 `0001_init`）;**無架構變更、無新 library/infra**。
  - **Deliverables**：`apps/api/src/leaves/**`、`apps/api/src/core/audit/**`、`apps/api/src/auth/scope-resolver.service.ts`（+spec）、`apps/api/src/app.module.ts`。
  - **Owner**：Claude(impl) / Human(線上+accept)。
- [~] **Step 2 — Attendance（手動 SoT + ADR-002 override-on-edit）** — `IMPLEMENTED / VERIFICATION_PENDING`
    - [x] `AttendanceService`：`POST /attendance`（手動 `source=MANUAL`;每日一列 upsert）、`GET /attendance?classId=&date=`（staff 班級視圖）/`?studentId=`（家長/該生）、`PATCH /attendance/:id`
    - [x] **Override（ADR-002 rule 4）**：改到一筆 `source=LEAVE_EVENT` 列 → 轉 `MANUAL`、記 `overriddenAt/overriddenBy`、保留 `derivedFrom`（血緣）、清 active `sourceRef`;audit `attendance.override`
    - [x] 每個變更於**同一 `$transaction`** 寫 Attendance + `OutboxEvent(AttendanceMarked)` + `AuditLog`
    - [x] 授權：coarse `@Roles` + service `ScopeResolver`（寫=canManageStudentClass 自班、家長讀=canAccessStudent、班級清單=canManageClass）
    - [x] **API 級 e2e**（`src/e2e/api.e2e.spec.ts`，supertest + 真實 JWT）：401/403/400/409 + override，涵蓋 Leave + Attendance 完整 HTTP pipeline
    - [x] 本機：typecheck ✓、jest **68 tests** ✓（含 e2e 9 / attendance 10）、nest build ✓、`node dist/main.js` DI boot ✓（AttendanceModule + 3 routes）
    - [ ] CI 綠 → Render 線上 → Human Acceptance
  - **範圍界定**：本步做手動 SoT + 老師改 Derived→MANUAL 的 override 路徑（以 seed 既有 LEAVE_EVENT 列驗）;**不做** `LeaveApproved`→投影 Attendance 與 `LeaveRejected/Cancelled` 回滾（需 Worker 消費 Outbox = **Step 3**）。
  - **無新 migration**;**無架構變更**。新增 devDep `supertest`/`@types/supertest`（僅測試用）。
  - **Deliverables**：`apps/api/src/attendance/**`、`apps/api/src/e2e/api.e2e.spec.ts`、`apps/api/src/app.module.ts`、`apps/api/package.json`+lockfile。
- [ ] Step 3 — Event 串接（Outbox → Worker dispatch;LeaveApproved 投影 Attendance + 回滾 + Notification）— `NOT_STARTED`
- [ ] Message Center · Announcement · Notification / LINE Push — `NOT_STARTED`
- [ ] Audit（out-of-band durable path + append-only REVOKE + 查詢端點）— `NOT_STARTED`
- [ ] Dashboard · Branding · Feature Flag — `NOT_STARTED`

## Phase 8 — Integration / Hardening  ⬜
- [ ] 多校隔離 / secret exposure / 錯誤處理 / 效能 — `NOT_STARTED`
- [ ] **ESLint（清 Technical Debt）** — `NOT_STARTED`

## Phase 9–10 — Pilot / Production  ⬜  `NOT_STARTED`
## Phase 11+ — Future domains  ⬜  `DEFERRED`（需明確批准）
