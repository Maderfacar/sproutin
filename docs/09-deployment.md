# 09 — 部署、CI/CD、Migration (Revised, §21–23)

> 已確認：**Docker，每校獨立 Instance，同一 Build Artifact 部署到不同 School Instance。**
> Web / API / **Worker** 形成一個 container set。**PostgreSQL 優先採 Managed / 獨立 DB deployment，不與 app container 綁定。**

## 1. 每校 Container Set

```text
School Instance
├── sproutin-web     (Next.js)       env: SCHOOL_SLUG, API_INTERNAL_URL（server-only；per-school 值走 runtime /api/public-config）
├── sproutin-api     (NestJS)        env: DATABASE_URL, REDIS_URL, LINE_*, JWT_SECRET
├── sproutin-worker  (BullMQ)        同 codebase，不同 entrypoint（Outbox/LINE push）
└── sproutin-redis   (Redis)

外部（不在 container set 內）：
└── PostgreSQL       ★ Managed / 獨立 DB（每校一個），透過 DATABASE_URL 連入
```

**同一份 image**（`sproutin-web:vX` / `sproutin-api:vX`；worker 與 api 共用 image、不同 CMD）部署到所有學校，差異只在注入的環境變數 (§20)。

## 2. 為什麼 PostgreSQL 獨立 / Managed（修正）

- 資料庫生命週期（backup、HA、版本升級）與 app 部署解耦。
- 符合 §19 DB-per-school：每校一個獨立 Managed PG 實例或獨立資料庫。
- credentials 以 **secret reference** 注入（Control Plane 只存引用，不存明文）。

## 3. 環境變數分層（ADR-001 / ADR-004）

| 類別 | 來源 | 注入方式 | 範例 |
|------|------|----------|------|
| Build-time 常數 | image 內建 | build | 全校一致設定 |
| 每校非機密 public config | 該校 DB `SchoolConfig` | runtime 經 `/config/public` | liffId、branding、apiBaseUrl、public flags |
| 每校伺服器 runtime（**server-only**） | Control Plane 注入 | container env | `SCHOOL_SLUG`、`API_INTERNAL_URL`（**不進 public config / bundle**） |
| **機密 secret** | **Secret Manager**（ref 存 Control Plane） | 部署時解析 → container env | `DATABASE_URL`、LINE channel secret/token、JWT secret |

> **關鍵（ADR-001）**：per-school 值**不進 frontend bundle**、不用 `NEXT_PUBLIC_*` 承載。瀏覽器打 same-origin `/api/public-config` 於請求期取得，故同一 web image 適用所有學校。
> **關鍵（ADR-004）**：Control Plane 只存 `databaseSecretRef` / `lineSecretRef` / `jwtSecretRef`；真值在 Secret Manager，部署時解析注入，不落地、不入 image、不入 git。

## 4. CI/CD (§21)

```text
Git push → CI
  ├─ lint + typecheck
  ├─ unit + integration test（80%+）
  ├─ build web/api image → tag vX（Version Tracking）
  └─ push image to registry
        │
        ▼
CD（Control Plane Orchestrator）
  Staging → Test School → Small Batch → All Schools
```

## 5. 分階段部署 (§22)

```text
Development → Staging → Test School → Small Batch → All Schools
```
**禁止人工逐校更新**。由 Orchestrator 依 Instance Registry 逐批推進，每批 Health Check 通過才進下一批。

## 6. Migration 策略 — Expand / Migrate / Contract (ADR-003)

> **不假設 restore backup 永遠安全**：migration 後可能已有新業務資料寫入，restore 會遺失資料。

### 6.1 三階段（預設 backward-compatible）

| 階段 | 內容 | 相容性 |
|------|------|--------|
| **Expand** | 加 nullable 欄位、新表、`CREATE INDEX CONCURRENTLY`、新 enum 值 | vN/vN+1 皆可 → image rollback 安全 |
| **Migrate** | dual-write / backfill；讀舊或新 | 雙相容時 → rollback 安全 |
| **Contract** | drop/rename、加 NOT NULL | 僅在全 instance 升級 + backfill 驗證後、於**後續 release** → rollback 不安全 |

破壞性變更**不與**引入它的 app 版本同批上線。

### 6.2 回復決策矩陣

| 情況 | 動作 |
|------|------|
| Expand-only、無 contract、DB 為舊 app 超集 | **可 rollback image**（DB 保留） |
| 已有新資料以新 schema 寫入 / contract 已執行 / 部分套用 | **只能 forward-fix DB**（新 migration 修正；**不得** restore） |
| DDL 中途失敗、schema 不一致、且尚無有意義新寫入 | **restore / PITR**（最後手段、maintenance、接受資料遺失風險） |

### 6.3 安全機制

- **Locking**：Prisma advisory lock + Control Plane 標 `MIGRATING`，杜絕並發。
- **Timeout**：設 `lock_timeout`/`statement_timeout`；長索引 `CONCURRENTLY`（非交易內）；逾時 abort → FAILED → forward-fix。
- **Partially migrated**：失敗 instance 停 `FAILED`、隔離、**不自動前進**，人工 forward-fix 或 PITR。
- **PITR**：每校 Managed PG 啟用；migrate 前快照僅為標記點。
- **Zero/minimal downtime**：expand/contract 支援 rolling；僅 contract/PITR 需維護窗。
- **Schema version tracking**：各 DB `_prisma_migrations` 為真實；Control Plane `schemaVersion` 鏡射。

要求全具備：**Version controlled · Reproducible · Automated · Backup/PITR · Health Check · Version Tracking · 分類 Rollback**。正式環境**禁止手動改 schema** (Rule 9)。

## 7. Migration Runner（概念，ADR-003）

```text
For each instance in Registry (依批次):
  1. status = MIGRATING（取 lock）
  2. 確保 PITR/快照標記點就緒
  3. resolve databaseSecretRef → DATABASE_URL；prisma migrate deploy（含 timeout）
  4. Health Check（/health：DB、Redis、schemaVersion）
  5. 成功 → 部署新 image、status=ACTIVE、記錄 currentVersion/schemaVersion、DeploymentRecord=DEPLOYED
     失敗 → 依 6.2 矩陣決定：image rollback / forward-fix / restore；status=FAILED（不自動前進）
```

## 8. Health Check（新增）

- API 提供 `/health`：DB 連線、Redis、目前 version。
- Worker 提供存活探針。
- Orchestrator 依 `/health` 決定是否進下一批。

## 9. MVP 落地順序

- **MVP**：跑通**單一 instance**（Test School）的 Web+API+Worker + Managed PG + CI + migrate + backup + health + rollback。
- **Reserved**：Control Plane 多校批次自動編排——先做單校流程，多校批次之後補（架構已預留）。
