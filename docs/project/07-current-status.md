# Current Status

> 唯一要求「持續更新」的進度文件。每次完成並**通過驗收**後更新。
> Last updated: 2026-08-11

Current Phase:
Phase 5 — Project Skeleton（＝先前非正式「Step 11」）

Current Milestone:
R1 — Foundation（skeleton 可部署/可驗證）

Status:
```text
Implementation:   IMPLEMENTED
Verification:     PENDING
Human Acceptance: PENDING
```
（Claude 已明確表示尚未完成 compile / runtime verification，故不得標 ACCEPTED。）

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
- **AQ-1 — Worker / BullMQ Production Hosting vs Vercel 偏好**（待 Architecture Review；Claude 不自行改）
  ```text
  Existing Decision : 部署 = Docker container set（Web / API / Worker / Redis），每校一組；
                      Worker 為長駐 BullMQ processor（ADR-005 / docs/04 / docs/09）。
  Problem           : Human Owner 部署偏好為 Vercel（Git→Push→CI→Vercel→Online）。
                      Vercel serverless 不適合託管長駐 Worker 進程與持續性 BullMQ consumer。
  Evidence          : BullMQ 需常駐 Node 進程消費 Redis 佇列（Outbox dispatch、LINE push、
                      out-of-band audit）；Vercel Functions 短生命/無常駐 worker；Cron 非佇列消費者。
  Alternative       : (a) Web(+可能 API) 置 Vercel，Worker + Redis 置長駐平台（如 Railway/Render/Fly/
                          managed container）；
                      (b) Web/API/Worker 全置容器平台（放棄 Vercel Preview DX）；
                      (c) 改用 serverless 佇列取代 BullMQ —— 屬變更既有決策（ADR-005），不得自行決定。
  Trade-off         : (a) 保留 Vercel 前端 DX，但雙平台/雙部署目標；
                      (b) 部署一致但失去 Vercel Preview；
                      (c) 架構大改，未經審查不採。
  Recommendation    : **保留 Worker + BullMQ + Redis 抽象不變**；production 將 Worker + Redis 置於
                      長駐平台、Web 置 Vercel、API 擇一。不改佇列技術。**決策 deferred 至 Architecture Review。**
  ```

Human Owner Actions:
- 建 GitHub repo、接 Vercel、啟用 CI（Phase 5 驗收前提）
- 決定 git 初始化 / 首次 commit 方式（目前 repo 未 init）
- 回覆 **AQ-1（Worker hosting）**
- 準備 LINE Developers / OA、Managed PostgreSQL、Redis provider（Phase 6 前）

Next Task:
- **Phase 5 驗收**：Push → CI 綠燈 → Vercel Preview → Online 驗證（`/health`、`/config/public`、web）→ Human Acceptance。
- 通過後**才**進 Phase 6 — Vertical Slice（DB migration → LINE/LIFF 登入骨架 → RBAC 骨架 → 端到端切片）。Claude 不自行進入。

Last Commit:
- — （git 尚未初始化）

Last CI:
- — （尚無 CI run）

Last Vercel Preview:
- — （尚未建立）

Last Accepted Release:
- None
