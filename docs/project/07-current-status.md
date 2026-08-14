# Current Status

> 每次完成並**通過驗收**後更新。**逐日跟讀請看 [08-development-progress.md](./08-development-progress.md)**（本檔為 project-control 內部現況）。
> Last updated: 2026-08-15（Phase 7 Step 1 IMPLEMENTED — Leave 狀態機）

Current Phase:
Phase 7 — Core MVP（進行中）。Phase 6 — Vertical Slice ✅ COMPLETE（2026-08-14, Human Owner）。

Current Milestone:
Phase 7 Step 1（Leave 狀態機 + 寫入端 Outbox + transactional audit）→ **IMPLEMENTED / VERIFICATION_PENDING**。

Status:
```text
Phase 5/6: ACCEPTED
Phase 7 Step 1 — Leave 狀態機：IMPLEMENTED / VERIFICATION_PENDING
  狀態機 PENDING/APPROVED/REJECTED/CANCELLED（config-driven;非法轉移→409）
  同交易寫 Leave + OutboxEvent（PENDING，Step 3 消費）+ AuditLog（transactional，ADR-005 類別一）
  端點 POST/GET /leaves · PATCH /leaves/:id/{status,cancel};ScopeResolver +canManageStudentClass
  本機 typecheck/jest(49)/build/DI-boot 綠;待 CI + Render 線上 + Human Acceptance
```
（範圍 A：不含 Worker dispatcher[Step 3] / Attendance 投影[Step 2] / out-of-band audit + append-only REVOKE[Step 6]。無新 migration/架構變更。）

Completed（已建立，未驗收）:
- 三項 Architecture clarification 同步（Runtime Config server-only / Leave-Attendance dual SoT rule / Audit durable path）
- Monorepo（pnpm workspace + Turborepo）
- NestJS skeleton（main / app.module / PrismaService）
- Next.js skeleton（layout / page / same-origin `/api/public-config`）
- Prisma schema baseline（各校 schema + Control Plane schema）
- PostgreSQL schema baseline（Student/User/Leave/Attendance/Audit/Outbox…）
- Redis / BullMQ **worker skeleton**（`worker.ts` + `start:worker`）
- Docker baseline（Dockerfile.api/web + docker-compose.school.yml）
- CI baseline（install → db:generate → typecheck → test → build）
- Test baseline（jest + health spec）
- `/health`、`/config/public`
- server-only runtime configuration（`API_INTERNAL_URL` 不進 bundle/public config）
- zero feature implementation

In Progress:
- （無主動 in-progress；等待 Phase 5 驗收）

Verification Pending:
- `pnpm install` / `db:generate` 成功（尚未執行）
- CI 綠燈（尚未 push；無 CI run）
- Vercel Preview（尚未建立）
- Online：`/health`、`/config/public`、web 首頁 runtime config
- Secret exposure 檢查（bundle / public config / logs 無 secret、無 internal URL）

Blocked:
- 無硬性 Blocker。（驗證依賴 Human Owner 接 GitHub/Vercel/CI）

Technical Debt:
- **ESLint flat config 未建** → CI 暫略 `lint`。列為 DEFERRED；**MVP Release Candidate（Phase 8）前必須完成**，不得永久忽略。

Architecture Questions:
- **AQ-1 / AQ-2 — DECIDED（2026-08-14, ADR-006）**：架構不變，僅定部署位置 → Vercel: Web ｜ Render: API + Worker ｜ Managed Redis（Render Key Value）｜ Managed PostgreSQL。
- 目前無待決 Architecture Question（None open）。

- **NOW**：Blueprint 統一建立版 —— 刪除先前手動建立、無資料的 Postgres/Key Value；（確認後）Apply Blueprint，一次建立 api+worker+Key Value+Postgres（全部 Singapore），連線字串由 `fromDatabase`/`fromService` 自動注入。**render.yaml 已改為統一建立全部資源。**
- **NEXT**：與 Claude 一起後端線上驗證（/health、/config/public、API→PG、Worker→Redis）→ Human Acceptance
- **LATER**：LINE Developers / OA / LIFF（Phase 6）；demo data / test accounts

Next Task:
- **Phase 6 Step 1 收尾**：CI `db` job 綠燈 → Render 線上 migrate（preDeploy 自動）+ seed one-off job → Human Acceptance（Step 1）。
- 通過後**才**進 Step 2（LINE / LIFF 登入骨架，卡 Human Owner LINE 憑證）。Claude 不自行跳步。

Last Commit:
- （見 08-development-progress「Latest Accepted Commit」；本檔不重複維護 commit hash）

Last CI:
- ✅ SUCCESS（run 31732797734；install/db:generate/typecheck/test/build）

Last Vercel Preview:
- https://sproutin-kb91-theta.vercel.app （apps/web, Production, Ready）

Last Accepted Release:
- **Phase 5（R1 Foundation + 後端部署）— ACCEPTED（2026-08-14, Human Owner）**：Frontend(Vercel) + Backend API/Worker(Render) + Redis + PostgreSQL + CI + Web→API 全數線上驗證通過。
- Next: Phase 6 — Vertical Slice（於新 session 啟動）。
