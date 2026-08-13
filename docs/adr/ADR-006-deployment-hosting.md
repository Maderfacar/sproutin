# ADR-006 — Deployment Hosting（Vercel + Render）

**Status:** Accepted (2026-08-14) — 由 Human Owner 正式決策，關閉 AQ-1 與 AQ-2。

## Context

AQ-1（Worker/BullMQ hosting）與 AQ-2（API hosting）待決：Human Owner 偏好 Vercel，但 Vercel serverless 不適合長駐 BullMQ Worker 與常駐 NestJS。需在**不更動架構**的前提下決定部署位置。

## Decision

**只決定部署位置，架構完全不變**（Modular Monolith + Web/API/Worker/Redis/PostgreSQL）。

| 元件 | 技術（不變） | 部署位置（本 ADR 決定） |
|------|--------------|------------------------|
| Frontend Web | Next.js | **Vercel** |
| Backend API | NestJS | **Render — Web Service** |
| Background Worker | BullMQ Worker | **Render — Background Worker** |
| Queue / Cache | Redis | **Managed Redis**（優先 Render Key Value） |
| Source of Truth | PostgreSQL + Prisma | **Managed PostgreSQL** |

```text
Vercel   └── Web
Render   ├── API (NestJS, web service, /health)
         └── Worker (BullMQ, background worker)
Managed Redis      └── Queue / Background Jobs
Managed PostgreSQL └── Source of Truth
```

- API 與 Worker **共用同一 Docker image**（`ops/deploy/Dockerfile.api`），靠 CMD 區分（api=`start:prod`，worker=`start:worker`），對齊 §20「One Codebase / Build Artifact」。
- 部署設定：`render.yaml`（Blueprint）。

## 明確不做（Non-goals）

不因此決策而：改 Microservices、換 NestJS/PostgreSQL/Prisma/BullMQ/Next.js、把 Worker 改 Serverless Function、把 Queue 邏輯搬前端、把 DB-per-School 改共用 DB。

## Alternatives Considered

- **API/Worker 塞進 Vercel serverless**：NestJS 常駐 + BullMQ 長駐不相容；冷啟動/連線池問題。否決。
- **全部放單一容器平台（含 Web）**：一致但失去 Vercel 前端 DX。否決（保留 Vercel 前端）。
- **改用 serverless 佇列取代 BullMQ**：屬變更既有決策（ADR-005），不在本 ADR 範圍。否決。

## Consequences

- (+) 前端保留 Vercel DX；後端/Worker 用長駐平台（Render）符合既有架構。
- (+) API+Worker 同 image，維持單一 build artifact。
- (−) 雙平台維運（Vercel + Render）；Render background worker 需付費方案。
- **DB / Redis 範圍**：本階段僅 **test/dev** 各一（Render Postgres + Key Value）；正式 **DB-per-School** 於後續 Provisioning 階段依架構逐校建立，不在此階段大量建立。
- **Blueprint 統一管理（2026-08-14 最終）**：Human Owner 決定刪除先前手動建立、無資料的 Postgres/Key Value，改由 `render.yaml` **統一建立** 四個 resource：`sproutin-api`、`sproutin-worker`、`sproutin-redis`（keyvalue，`maxmemoryPolicy=noeviction`）、`sproutin-db`（postgres）。全部 `region=singapore`。api/worker 以 `fromDatabase`/`fromService` 自動取得 `DATABASE_URL`/`REDIS_URL`（server-only，不暴露 client）。`JWT_SECRET` 由 Render `generateValue` 產生；LINE 變數 `sync:false`（Phase 6 填）。
  > 註：本專案曾短暫評估「引用既有手動資源」（Environment Group + sync:false），因 Human Owner 選擇由 Blueprint 統一管理而回到此方案；Render 的 `fromDatabase`/`fromService` 僅能引用同一 Blueprint 內資源，統一管理下即可直接使用。
- 影響檔案：`render.yaml`、`ops/deploy/Dockerfile.api`、`apps/api/src/main.ts`（PORT 綁定）、`apps/api/src/worker.ts`（Redis 自我測試）、`docs/09-deployment.md`、`docs/project/05`。
