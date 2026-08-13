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
- **既有資源引用（2026-08-14 更新）**：Human Owner 已手動建立 Postgres 與 Key Value。故 `render.yaml` **只宣告 api + worker**，**不宣告 databases/keyvalue**（避免 Apply 重複建立）；`DATABASE_URL`/`REDIS_URL` 經 **Environment Group `sproutin-backend`（sync:false）** 提供，值由 Human Owner 於 Render 後台填入既有資源的 Internal 連線字串。理由：Render 的 `fromDatabase`/`fromService` 僅能引用同一 Blueprint 內宣告的資源，無法安全引用 Blueprint 外手動建立者。Key Value 的 `maxmemory-policy=noeviction`（BullMQ 需求）改由 Human Owner 於後台設定。
- 影響檔案：`render.yaml`、`ops/deploy/Dockerfile.api`、`apps/api/src/main.ts`（PORT 綁定）、`apps/api/src/worker.ts`（Redis 自我測試）、`docs/09-deployment.md`、`docs/project/05`。
