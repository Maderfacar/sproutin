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
    - [x] Outbox dispatcher / processors（**Phase 7 Step 3**：Nest context + poller + BullMQ consumer）
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
- [x] **CI 未建置 Docker image**（Phase 7 Step 1 暴露）— ✅ **RESOLVED（Phase 7 Step 3）**：CI 新增 `docker-build` job（`docker/build-push-action`，push:false，用同一 `ops/deploy/Dockerfile.api`），讓 Docker build context 與 CI 分歧的錯誤（如缺 `tsconfig.base.json`）在 CI 就紅燈。待 CI 綠驗證。

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
- [x] **Step 1 — Leave 狀態機（+ 寫入端 Outbox + transactional audit）** — `ACCEPTED`（2026-08-15, Human Owner;CI run 31840973966 綠 + Render 線上 `/leaves` 401 + API e2e 覆蓋帶登入流程）
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
- [x] **Step 2 — Attendance（手動 SoT + ADR-002 override-on-edit）** — `ACCEPTED`（2026-08-15, Human Owner;CI 綠 + Render 線上 `/attendance` 401 + API e2e override 覆蓋）
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
- [x] **Step 3 — Event 串接（Outbox → Worker dispatch）** — `ACCEPTED`（2026-08-15, Human Owner;CI run 31862077030 綠 = build + db + docker-build）
    - [x] `apps/api/src/events/**` 新 module：`OutboxDispatcherService`（poller：claim PENDING→PROCESSING status-guard、markDispatched/markFailed、resetStaleProcessing reaper）、`EventHandlersService`（事件路由）、`LeaveEventHandler`（投影/回滾/通知）、`RecipientsService`、`NotificationService`、`day-key`（UTC 午夜逐日）、`WorkerModule`
    - [x] `worker.ts` 改寫：`NestFactory.createApplicationContext(WorkerModule)`（重用 Prisma/Audit，決策 2=A）+ Outbox poller → BullMQ `events` 佇列（jobId=outbox.id 去重）→ consumer 跑 handler → 標 DISPATCHED;retry/backoff/DLQ 由 BullMQ 提供（決策 1=B）
    - [x] `LeaveApproved` → 逐日 upsert `Attendance(source=LEAVE_EVENT)`;當日已 `MANUAL`（override）→ 不覆寫、發 `attendance.override_conflict`（Notification + AuditLog）
    - [x] `LeaveRejected/Cancelled` → 只刪 `LEAVE_EVENT AND sourceRef=leaveId` 列;`MANUAL AND derivedFrom=leaveId` 不觸碰、發衝突通知（ADR-002 rule 4/5/7）
    - [x] 各事件 → 站內 `Notification`（收件人：LeaveSubmitted→審核者、Approved→家長+老師、Rejected→家長、Cancelled/conflict→老師+行政）;LINE Push 屬 Step 5
    - [x] **併入**：CI 新增 `docker-build` job（清 tech debt「CI 未建置 Docker image」）
    - [x] 本機：typecheck ✓、jest **86 tests** ✓（+18：day-key 4 / handler 8 / dispatcher 6;worker DI boot smoke）、build ✓、`node dist/worker.js` boot guard ✓
    - [ ] CI 綠（build + db + docker-build）→ Render worker log 觀察 dispatch → API/DB 驗投影/DISPATCHED/Notification → Human Acceptance
  - **無新 migration**（`OutboxEvent.status` 為自由 String，新增 PROCESSING/DISPATCHED/FAILED 值零 migration;Attendance/Notification 已在 `0001_init`）;**無架構變更**。
  - **設計決策（Human Owner 確認）**：1=Outbox+BullMQ relay、2=Nest context 重用、3=收件人規則如上、4=day-key UTC 午夜（對齊 seed）。
  - **Deliverables**：`apps/api/src/events/**`、`apps/api/src/worker.ts`、`apps/api/src/worker.boot.spec.ts`、`.github/workflows/ci.yml`。
- [x] **Step 4 — Message · Announcement · Notification（站內讀取端）** — `ACCEPTED`（2026-08-15, Human Owner;CI run 31863276030 綠 + 線上 /messages·/announcements·/notifications 皆 401）
    - [x] **Notifications**（`notifications/**`）：`GET /notifications?unread=`（本人）+ `PATCH /notifications/:id/read`（idempotent）;只需登入、service 以 userId 過濾
    - [x] **Messages**（`messages/**`，雙向）：`POST /messages`（校方↔家長，綁 student，classId 由 DB 推導）、`GET /messages?studentId=`（+ 本人 isRead）、`PATCH /messages/:id/read`（MessageRead upsert）;授權 `canAccessStudent`;同交易寫 Message + `OutboxEvent(MessageSent)` + `AuditLog(message.send)`
    - [x] **Announcements**（`announcements/**`）：`POST /announcements`（SCHOOL→OWNER/ADMIN;CLASS→OWNER/ADMIN 或 TEACHER 自班）、`GET /announcements`（可見範圍：全校 + 相關班級）;同交易寫 Announcement + `OutboxEvent(AnnouncementPublished)` + `AuditLog(announcement.publish)`
    - [x] **Worker handler 擴充**：`MessageEventHandler`（通知家長+老師、排除發訊者）、`AnnouncementEventHandler`（全校→所有 User;班級→該班老師+該班家長）;`EventHandlersService` 加 MessageSent / AnnouncementPublished 路由;`RecipientsService` 加 forClass/allUsers
    - [x] 本機：typecheck ✓、jest **109 tests** ✓（+23）、build ✓、`node dist/main.js` boot ✓（/messages·/announcements·/notifications 路由全 mapped、DI 無誤）;`app.module.spec` + `worker.boot.spec` DI smoke 自動涵蓋新 module
    - [ ] CI 綠 → Render 線上（路由 401）→ Human Acceptance
  - **雙向決策（Human Owner）**：訊息雙向;公告權限/可見範圍照建議。**無新 migration**（Message/MessageRead/Announcement/Notification 已在 `0001_init`）;**無架構變更**。
  - **Deliverables**：`apps/api/src/{messages,announcements,notifications}/**`、`apps/api/src/events/{message,announcement}-event.handler.ts`（+ event-handlers/recipients/worker.module 擴充）、`apps/api/src/app.module.ts`。
- [~] **Step 5 — Notification / LINE Push** — `IMPLEMENTED / VERIFICATION_PENDING`（卡 Human Owner 於 Render 填 Messaging access token + LINE 好友/provider 才能線上驗）
    - [x] `LinePushClient`（`events/line-push.client.ts`）：呼叫 LINE Messaging push API;token 來自 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`（未設定→略過，不丟出）;非 2xx→丟出交 BullMQ 重試
    - [x] `PushNotificationService`：**只推重點事件**（Human Owner 決策）—— `LeaveApproved`/`LeaveRejected`→家長;`MessageSent`→家長+老師（排除發訊者）;其餘不推。收件人沿用 `RecipientsService`;userId→lineUserId 由 `LineIdentity` 對映;未綁 LINE 略過
    - [x] `worker.ts`：新增 `line-push` BullMQ 佇列 + consumer;events consumer 於 `markDispatched` 後 enqueue 推播（best-effort + 重試;失敗進 failed set 作 DLQ）
    - [x] `render.yaml`：`sproutin-worker` 加 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`（sync:false）
    - [x] 本機：typecheck ✓、jest **113 tests** ✓（+4：只推重點 / 排除發訊者 / 未綁 LINE 略過 / 非重點不推）、build ✓、worker DI smoke ✓
    - [ ] **Human Owner 前置**：Render 填 Messaging access token;LINE 後台確認 Login/Messaging 同 provider（userId 一致）+ 收播者加 OA 好友 → 線上實測收到推播 → Human Acceptance
  - **決策（Human Owner）**：只推重點（核准/駁回/新訊息）;best-effort + BullMQ 重試（不加第二層 outbox）。**無新 migration、無架構變更**（沿用 Step 3 dispatcher，新增一條 push 佇列）。
  - **Deliverables**：`apps/api/src/events/{line-push.client,push-notification.service}.ts`、`apps/api/src/worker.ts`、`apps/api/src/events/worker.module.ts`、`render.yaml`。
- [x] **Step 6 — Audit out-of-band durable path + 稽核查詢端點** — ✅ **ACCEPTED**（2026-08-16, Human Owner;CI run 31904698836 綠 + 線上 `/audit-logs` 401 + CI e2e 覆蓋帶 token 流程）
    - [x] **API 端 `audit` 佇列 producer**（`core/audit/audit-enqueuer.service.ts`）：DENIED/FAILURE/敏感 READ → enqueue durable BullMQ `audit`（Redis + retry/backoff + DLQ）;**無 REDIS_URL → 降級記 structured ERROR log、lazy 連線、永不丟出/阻塞**（ADR-005 last-resort）。決策 1 = 佇列。
    - [x] **DENIED 落地**：`RolesGuard`/`ScopeGuard` 擋下 → `enqueue(result=DENIED)`（actor/action/resource/scope，fire-and-forget）;`AuthModule` re-export `AuditModule` 讓 guards 在 consumer context 解析 `AuditEnqueuer`
    - [x] **FAILURE 攔截**：全域 `AuditFailureInterceptor`——狀態變更請求（POST/PUT/PATCH/DELETE）的 5xx → `enqueue(result=FAILURE)`;**刻意不記 4xx**（驗證/衝突噪音）
    - [x] **敏感 READ 白名單**：`@AuditRead` 裝飾器 + 全域 `AuditReadInterceptor`，僅掛 `GET /students/:id`（`student.read`）、`GET /messages`（`message.read`）;清單類不記（決策 3）
    - [x] **稽核查詢端點** `GET /audit-logs`（`audit-logs/**`）：`@Roles('OWNER','ADMIN')`;篩選 resourceType/resourceId/actor/from/to;分頁 limit(≤100)/offset + `meta.total`;查詢本身記 `audit.read`（決策 4）
    - [x] **Worker `audit` consumer**（`worker.ts`）：INSERT 進 AuditLog（`AuditService.recordStandalone`，append-only）;丟出→BullMQ 重試→failed set 作 DLQ。boot guard 未動（無 Redis 仍 exit 1）
    - [x] 本機：typecheck ✓、jest **126 tests** ✓（+13）、build ✓、`node dist/main.js` boot（`/audit-logs` mapped）✓、`worker.js` 無 Redis exit 1 ✓;`app.module.spec`+`worker.boot.spec` DI smoke 涵蓋新 provider/攔截器/consumer。e2e 403 案例自然觸發 DENIED enqueue（降級 log 可見）
    - [x] CI 綠（build+db+docker-build，run 31904698836）→ Render 線上 `/audit-logs` 401 → Human Acceptance ✅（2026-08-16）;帶 token DENIED 列/查詢流程由 CI e2e + 單元測試覆蓋
  - **append-only DB 層強制（決策 A，migration 0002）**：程式層——`AuditService` 只 create、無改/刪路徑 + 測試斷言;**DB 層——trigger** 擋 `AuditLog` UPDATE/DELETE/TRUNCATE（`RAISE EXCEPTION`;即使 owner 連線也擋）。純 expand migration、零 infra。CI db job（`verify.ts`）斷言 INSERT 允許 / 改·刪·清空被擋 + drift 需過。owner 連線 REVOKE 無效故不用 REVOKE。least-privilege role 分離屬未來 hardening（Phase 8+，非必要）。
  - **無新 migration、無新 library（沿用 BullMQ/ioredis/rxjs）、無架構變更。**
  - **Deliverables**：`apps/api/src/core/audit/{audit.service,audit-enqueuer.service,audit.util,audit-read.decorator,audit-read.interceptor,audit-failure.interceptor,audit.module}.ts`、`apps/api/src/audit-logs/**`、guards（roles/scope）、`auth.module.ts`、`app.module.ts`、`students`/`messages` controller（`@AuditRead`）、`worker.ts`。
- [~] **Step 7 — Dashboard · Branding · Feature Flag（前端可操作頁面）** — `IN_PROGRESS`（切子步驟:先家長→老師→園長）
  - [~] **7a — 前端地基 + 家長「請假」端到端** — `IMPLEMENTED`（本機 typecheck ✓ / test ✓[api 126 + shared 7 = 133] / build ✓;待 push→CI + Vercel + Human 手機實測）
    - [x] 前端地基:Tailwind（`tailwind.config.ts`/`postcss.config.js`/`globals.css`,品牌色走 CSS 變數）+ TanStack Query（`providers.tsx`）+ `next.config.mjs` `extensionAlias`（webpack 解析 shared NodeNext `.js`）
    - [x] runtime 品牌（ADR-001）:`BrandingProvider`（primary/secondary→CSS 變數、logo/banner→`AppShell`）;bundle 零 per-school 值
    - [x] session + 外框:`SessionProvider`（LIFF→JWT）、`StatusScreen`、`AppShell`、`/liff/layout.tsx`
    - [x] config-driven 卡片牆:`shared.selectDashboardCards`（角色聯集 + featureFlags + cardOrder,+7 單元測試）;`/liff` Dashboard,未實作功能顯示「即將推出」
    - [x] 家長請假端到端:proxy `/api/leaves`(+`/[id]/cancel`,`proxyToApi` helper)、`features/leave`（`LeaveForm`/`LeaveList`/hooks/labels）、`/liff/leave`（多小孩選擇器）
    - [x] 設計決策（Human Owner）:Tailwind+自建元件、TanStack Query（皆 §D 核准）、品牌=色/logo/banner、切子步驟先家長、版型模板留下一版;多重身份採聯集視圖（架構本就支援,零 schema 變更）
    - [x] push（commit 195cbfc）→ CI 綠（run 31913609567,build+db+docker-build）→ Production 路由 200/401 驗證
    - [ ] Human Owner 手機實測 acceptance（+ 家長 LINE 帳號對映前置）
  - [~] **7b 家長其餘卡片（出缺勤/訊息/通知/公告）** — `IMPLEMENTED`（本機 typecheck/test[133]/build 綠;待 push→CI + Vercel + Human 手機實測）
    - [x] 出缺勤（唯讀,依日期清單）:`/api/attendance` proxy、`features/attendance`、`/liff/attendance`
    - [x] 訊息（雙向）:`/api/messages`(+`/[id]/read`)、`features/message`（`MessageThread` 發訊+標已讀）、`/liff/message`
    - [x] 通知:`/api/notifications`(+`/[id]/read`)、`features/notification`、`/liff/notification`;入口為頁首 🔔（非 MVP_CARD）
    - [x] 公告（唯讀）:`/api/announcements`、`features/announcement`、`/liff/announcement`
    - [x] 共用抽出 `useSelectedStudent`/`StudentSelect`/`PageHeader`;啟用 attendance/message/announcement 卡片;leave 頁重構沿用
    - [x] push（commit f550589）→ CI 綠（run 31926435249）→ Production 200/401 驗證
    - [ ] Human Owner 手機實測 acceptance
  - [~] **7c 老師端（審核請假/點名/班級訊息·公告）+ 補後端** — `IMPLEMENTED`（本機 typecheck/test[143]/build 綠;待 push→CI + Vercel + Human 手機實測）
    - [x] 後端:`ScopeResolver.canManageClass`、`GET /classes`（ClassesModule）、`GET /leaves?classId=&status=`（listForClass）;+10 單元測試（api 136）
    - [x] proxy:`/api/classes`、`/api/leaves/[id]/status`、`/api/attendance`(POST)+`/[id]`(PATCH)、`/api/announcements`(POST)
    - [x] `lib/roles` 角色旗標;`features/classes`+`ClassSelect`
    - [x] 審核請假 `TeacherLeaveReviewPanel`、點名 `TeacherRosterPanel`、發公告 `TeacherAnnouncePanel`;班級訊息重用 7b MessageThread
    - [x] role-gated 併入 `/liff/{leave,attendance,announcement}`（聯集視圖）
    - [ ] push → CI 綠 → Vercel Preview → Human Owner 手機實測 acceptance（需老師 LINE 帳號對映）
  - [ ] 7d 園長·ADMIN（全校視角 + 稽核查詢頁）— `NOT_STARTED`

## Phase 8 — Integration / Hardening  ⬜
- [ ] 多校隔離 / secret exposure / 錯誤處理 / 效能 — `NOT_STARTED`
- [ ] **ESLint（清 Technical Debt）** — `NOT_STARTED`

## Phase 9–10 — Pilot / Production  ⬜  `NOT_STARTED`
## Phase 11+ — Future domains  ⬜  `DEFERRED`（需明確批准）
