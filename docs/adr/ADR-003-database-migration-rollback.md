# ADR-003 — Production-Safe Database Migration & Rollback

**Status:** Accepted (2026-08-11)

## Context

先前流程 `Backup → Migrate → Validate → Deploy`，失敗則 `Restore Backup → Rollback Image` 過度簡化。危險假設：**restore backup 永遠安全**。實際上 migration 期間可能已有新業務資料寫入，restore 會**遺失資料**；且並非所有 migration 都 backward-compatible（drop/rename/NOT NULL 無法用舊 app 版本相容）。每校獨立 DB (§19) 使問題乘以 instance 數。

## Decision — Expand / Migrate / Contract + 分類回復矩陣

### 1. 預設採 Expand / Migrate / Contract（parallel change）

| 階段 | 內容 | 相容性 |
|------|------|--------|
| **Expand** | 加 nullable 欄位、新表、`CREATE INDEX CONCURRENTLY`、新 enum 值 | vN 與 vN+1 皆可運作 → **image rollback 安全** |
| **Migrate** | dual-write / backfill；app 讀舊或新 | 仍雙相容時 → image rollback 安全 |
| **Contract** | drop column/table、rename、加 NOT NULL | 僅在所有 instance 升級且 backfill 驗證後、於**後續 release** 執行 → **image rollback 不安全** |

破壞性變更**不與**引入它的 app 版本同一次上線；拆成後續 release。

### 2. 回復決策矩陣

| 情況 | 動作 |
|------|------|
| Expand-only、未含 contract、DB 為舊 app 的**超集** | **可 rollback image**（DB 保留，舊 app 忽略新欄位） |
| Migration 部分套用、或 contract 已執行、或新資料已以新 schema 寫入且舊 app 無法讀 | **只能 forward-fix DB**（寫新 migration 修正；**不得** restore backup，否則遺失新資料） |
| DDL 中途失敗致 schema 不一致且 validation 立即失敗、且尚無有意義的新寫入 | **restore / PITR**（最後手段，per-instance、maintenance mode、接受資料遺失風險） |

### 3. 安全機制

- **Migration locking**：Prisma advisory lock + Control Plane 將 instance 標 `MIGRATING`，杜絕並發部署。
- **Timeout**：設 `lock_timeout` / `statement_timeout`；長索引用 `CREATE INDEX CONCURRENTLY`（不在交易內）；逾時即 abort → 標 FAILED → forward-fix。
- **Partially migrated instance**：Control Plane 追蹤 `schemaVersion`；失敗 instance 停在 `FAILED`，**不自動前進**，隔離不對外服務新版流量，人工 forward-fix 或 PITR。
- **PITR**：每校 Managed PG 啟用 PITR；migrate 前快照僅為**標記點**，非主要回滾手段。
- **Zero/minimal downtime**：expand/contract 支援 rolling deploy；僅 contract 或 PITR 需維護窗。
- **Schema version tracking**：各 DB 的 `_prisma_migrations` 為 DB 層真實；Control Plane `SchoolInstance.schemaVersion` 鏡射供編排。

## Alternatives Considered

- **一律 backup→migrate→restore rollback**：restore 遺失 migration 後新寫入的業務資料。否決為預設。
- **每次都停機 migrate**：違反 minimal downtime 與多校批次自動化。僅 contract/PITR 例外使用。

## Consequences

- (+) 多數升級可安全 image rollback、近零停機。
- (+) 明確界定何時 forward-fix、何時 restore，避免誤用 restore 遺失資料。
- (−) 破壞性變更需跨兩次 release（expand 一次、contract 一次），開發紀律成本上升。
- 影響：Control Plane schema 增 `schemaVersion`、DeploymentRecord 增 `migrationPhase`；deployment 流程與 runner 重寫。
