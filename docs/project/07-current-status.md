# Current Status

> 每次完成並**通過驗收**後更新。**逐日跟讀請看 [08-development-progress.md](./08-development-progress.md)**（本檔為 project-control 內部現況）。
> Last updated: 2026-08-14

Current Phase:
Phase 5 — Backend Deployment Preparation / Verification

Current Milestone:
Backend（API + Worker）on Render — 設定完成，待部署驗證

Status:
```text
Frontend: ACCEPTED（2026-08-14, Human Owner；Vercel web + CI green + online verified）
Backend:  DEPLOYED & VERIFIED（Render sproutin-api Live；/health、/config/public、API→PG）
Worker:   DEPLOYED & VERIFIED（Render sproutin-worker；Redis + self-test job）
剩餘: Web→API 佈線（Vercel API_INTERNAL_URL）+ Human Acceptance（Phase 5 整體）: PENDING
```
（部署決策 AQ-1/AQ-2 已定案 → ADR-006。CI 已綠：install/db:generate/typecheck/test/build。）

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
- **Backend deployment verification**：Human Owner 於 Render 部署 → Claude 協助線上驗證 → Phase 5 acceptance。
- 通過後**才**進 Phase 6 — Vertical Slice。Claude 不自行進入。

Last Commit:
- （見 08-development-progress「Latest Accepted Commit」；本檔不重複維護 commit hash）

Last CI:
- ✅ SUCCESS（run 31732797734；install/db:generate/typecheck/test/build）

Last Vercel Preview:
- https://sproutin-kb91-theta.vercel.app （apps/web, Production, Ready）

Last Accepted Release:
- None（R1 Foundation 部分驗收：前端 ACCEPTED；整體待後端）
