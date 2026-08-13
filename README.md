# Sproutin

以 **LINE Official Account + LIFF** 為入口的幼兒園校務管理與家長溝通 **SaaS** 平台。
讓幼兒園不需要求家長另外下載 App，直接透過 LINE 完成日常校務、親師溝通與學生資訊管理。

以 **Student 為核心資料單位**；Single Source of Truth + Event-driven + Config-driven + Backend-authoritative。

## 架構文件（SSoT）

完整架構、Domain、Schema、RBAC、事件、API、部署 → **[docs/](./docs/README.md)**

## 技術棧

| 層 | 技術 |
|----|------|
| Frontend | Next.js + TypeScript（LIFF + Web） |
| Backend | NestJS + TypeScript（Modular Monolith） |
| DB | PostgreSQL（每校獨立 DB） |
| ORM | Prisma |
| Cache/Queue | Redis + BullMQ |
| Auth | LINE Login / LIFF |

## Monorepo

```text
apps/web            Next.js
apps/api            NestJS
packages/db         Prisma schema + migrations
packages/shared     共用型別 / contract / events
ops/control-plane   Instance Registry（跨校中繼）
ops/deploy          Dockerfile / compose / migration
```

## 開發啟動（尚需先安裝依賴）

```bash
pnpm install
pnpm db:generate
pnpm dev
```

> 每校 instance 靠注入不同 `.env` 區分（見 `.env.example`）。同一份 image 部署到所有學校。

## 目前進度

- [x] Step 1–10 架構提案與確認（見 docs/）
- [x] Architecture v1.1 Final Review + 5 ADR（見 docs/adr/）
- [x] **Step 11 — Project Skeleton**：NestJS(/health, /config/public) + Next.js(runtime config) + Worker entrypoint + CI/Test baseline
- [ ] 下一步：啟動 → DB migration → LINE/LIFF 登入骨架 → RBAC 骨架 → 第一條 Vertical Slice

## 啟動骨架（驗證步驟）

```bash
pnpm install
pnpm db:generate            # 生成 Prisma client（typecheck/build 需要）
pnpm --filter @sproutin/api test
pnpm dev                    # 啟動 web + api
```

- API：`GET http://localhost:3001/health`、`GET http://localhost:3001/config/public`
- Web：`http://localhost:3000`（顯示 runtime public config）
