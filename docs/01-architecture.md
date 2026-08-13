# 01 — 系統架構

## 1. 技術棧 (§7–16，不得自行更動)

| 層 | 技術 | 用途 |
|----|------|------|
| Frontend | **Next.js + TypeScript** | LIFF app、Parent/Teacher/Admin UI、Dashboard、Message Center |
| Backend | **NestJS + TypeScript** | Modular Monolith，按 domain 切模組 |
| Database | **PostgreSQL** | 高關聯核心資料、transaction、reporting |
| ORM | **Prisma** | Schema、type-safe access、migration |
| Cache/Queue | **Redis** | Cache、BullMQ queue、LINE push queue、background jobs |
| Auth | **LINE Login / LIFF Identity** | 身分入口（LINE User ID ≠ Student） |

> Next.js 不為了用而過度 SSR —— 本專案主體是 authenticated app / dashboard / LIFF，以 client-side + API 為主。

## 2. Monorepo 結構

```text
sproutin/                      (pnpm workspace + Turborepo)
├── apps/
│   ├── web/                   Next.js — LIFF + Web UI
│   └── api/                   NestJS Modular Monolith（含 worker entrypoint）
├── packages/
│   ├── db/                    Prisma schema + migrations（單一 schema，多 DB）
│   ├── shared/                共用型別、DTO、Zod contract、event 定義
│   └── config/               共用 tsconfig / eslint / tailwind preset
└── ops/
    ├── control-plane/         Instance Registry + 部署編排器
    └── deploy/                Dockerfile、migration runner、rollback
```

**理由**：單一部署單元 (§12) + 前後端共用型別 → monorepo 最省。`packages/shared` 讓「Backend 定義 contract、Frontend 只消費」在型別層被強制執行。

## 3. 執行期拓樸 — Single-Tenant Multi-Instance (§19–20)

每間學校 = **同一份 image + 注入不同環境變數**（DB URL、LINE OA/LIFF config、branding）。

```text
                 One Codebase（同一 build artifact）
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   School A Instance   School B Instance   School N Instance
   ├─ api (env: A)     ├─ api (env: B)     ├─ api (env: N)
   ├─ web (env: A)     ├─ web (env: B)     ├─ web (env: N)
   ├─ Redis A          ├─ Redis B          ├─ Redis N
   └─ PostgreSQL A     └─ PostgreSQL B     └─ PostgreSQL N
                            │
                            ▼
                    Control Plane（跨校，唯一共用層）
                    ├─ Instance Registry
                    └─ Deployment Orchestrator
```

## 4. Control Plane（已確認納入）

Instance Registry 是**跨校中繼資料**，依「每校 DB 獨立」原則**不能塞進任一校的 DB**，故獨立為輕量 Control Plane。

**Control Plane 職責**（只管中繼，不碰學生資料）：
- **Instance Registry**：記錄有哪些學校 instance、各自的 DB URL、目前版本、健康狀態、LINE/LIFF config 參照。
- **Deployment Orchestrator**：批次部署新版本、觸發各 instance 的 migration、rollback 協調。

**Control Plane 自己的儲存**：一個極小的中央 PostgreSQL（`control_plane` DB），只存 instance 清單與部署紀錄。**絕不**存任何學生 / 家長 / 老師資料。

```prisma
// ops/control-plane 的獨立 schema（與各校 schema 分離）
// 只存 secret reference，絕不存明文憑證 (ADR-004)
model SchoolInstance {
  id                String   @id
  slug              String   @unique  // 對外識別，如 "happy-kids"
  displayName       String
  databaseSecretRef String             // Secret Manager key → 解析後得 DATABASE_URL
  lineSecretRef     String             // LINE channel secret / token 的 ref
  jwtSecretRef      String             // JWT secret 的 ref
  currentVersion    String             // app image 版本
  schemaVersion     String             // DB schema 版本（ADR-003 追蹤）
  status            InstanceStatus     // ACTIVE / MAINTENANCE / MIGRATING / SUSPENDED
  createdAt         DateTime @default(now())
}
model DeploymentRecord {
  id             String   @id
  instanceId     String
  fromVersion    String
  toVersion      String
  migrationPhase String?               // EXPAND / MIGRATE / CONTRACT (ADR-003)
  status         DeployStatus          // PENDING / MIGRATING / DEPLOYED / ROLLED_BACK / FAILED
  startedAt      DateTime
  finishedAt     DateTime?
}
```

> **Secret Reference 鏈 (ADR-004)**：Control Plane 存 ref → Orchestrator 部署時向 Secret Manager 解析 → 注入 container runtime env → app 讀 env。真值不落地、不入 image、不入 git。適用 DB 憑證、LINE Channel Secret、JWT Secret。

## 4b. 核心橫切關注（Cross-cutting）

除 domain 模組外，`core/` 提供三個橫切能力，全部在後端：

| 能力 | 說明 | 對應 |
|------|------|------|
| **Audit Log** | AuditInterceptor 同步寫入 append-only `AuditLog`：誰/何時/資源/action/結果。覆蓋學生・家長・（未來）健康・訊息・權限操作 | 修正 C |
| **Outbox + Worker** | 業務資料與事件同 tx 寫入 Outbox；獨立 **Worker container** 消費（通知、LINE push） | §4 |
| **SchoolConfig loader** | branding + feature flags + `leaveRequiresApproval`，啟動載入 | §24–26 |

**PostgreSQL 部署**：每校採 **Managed / 獨立 DB**，不與 app container 綁定；credentials 以 secret reference 注入（見 [09-deployment](./09-deployment.md)）。

## 4c. Runtime Configuration（ADR-001）

同一 Build Artifact 部署到 N 校，per-school 值**一律 runtime 取得**，frontend bundle **零** per-school 值（避免 `NEXT_PUBLIC_*` build-time 內嵌）：

```text
Same Web Image
   │ 瀏覽器打 same-origin /api/public-config（Next route handler，請求期讀 env）
   ▼
GET /config/public（API 讀該校 SchoolConfig）
   ├── School A → LIFF ID A / branding A
   ├── School B → LIFF ID B / branding B
   └── School C → LIFF ID C / branding C
```

- **Runtime 注入（非機密）**：liffId、LINE 公開 channel/basic id、branding、apiBaseUrl、public feature flags、cardOrder。
- **Build-time**：僅全校一致常數。
- **Instance 識別**：容器啟動注入伺服器端 env `SCHOOL_SLUG` / `API_INTERNAL_URL`（非 `NEXT_PUBLIC_`）。
- **`API_INTERNAL_URL` 為 server-only**：僅 web server route handler 內部連線用；瀏覽器走 same-origin，**不得**得知 internal URL，public config 不含之。
- **Secret 隔離**：public config 只回非機密；secret 一律走 env（ADR-004）。

## 4d. Migration 策略（ADR-003，摘要）

採 **Expand / Migrate / Contract**：預設 backward-compatible；破壞性變更拆到後續 release。回復分三種——**image rollback**（expand-only）／**forward-fix DB**（已有新資料或 contract）／**restore/PITR**（僅災難性、最後手段）。Control Plane 以 `schemaVersion` 追蹤，失敗 instance 隔離不自動前進。詳見 [09-deployment](./09-deployment.md)。

## 5. 整體資料流 (§31)

```text
LINE OA → LINE Login → LIFF → Next.js Frontend → API → NestJS Backend
                                                          │
                                     ┌────────────────────┼────────────────┐
                                     ▼                    ▼                ▼
                                PostgreSQL(該校)       Redis(該校)      LINE API
                                     │
                                     ▼
                              Domain Modules
                    Student · Parent · Teacher · Class ·
                    Attendance · Leave · Message ·
                    Announcement · Notification
```

## 6. 未來拆分路徑 (§13)

當某模組出現「大量流量 / 獨立部署需求 / 特殊運算 / AI processing / 大量 background jobs」時，才將該模組拆為獨立服務。屆時 Event-driven + Outbox 架構讓業務碼**不需重寫**，只把事件通道從 in-process 換成訊息佇列即可。
