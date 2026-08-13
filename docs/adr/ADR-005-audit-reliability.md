# ADR-005 — Audit Log Reliability & Transaction Semantics

**Status:** Accepted (2026-08-11)

## Context

AuditLog 同步寫入、不走 Outbox。需定義 transaction semantics，避免兩個極端：
- Audit 寫入失敗導致**整個 Sproutin 業務癱瘓**。
- Audit 淪為 best-effort 到**可完全遺失**。

**關鍵前提**：AuditLog 與業務資料同在**該校 PostgreSQL**。故 transactional audit **不引入新的可用性依賴** —— 該校 DB 掛掉時業務寫入本來就失敗。且每校獨立 DB → 一校的 audit/DB 問題**不影響**他校。

## Decision — 分層 Audit Reliability Policy

### 類別一：Transactional Audit（狀態變更的業務操作）

AuditLog 與業務變更寫在**同一 DB transaction**（同一校 DB）。二者**原子**：一起 commit 或一起 rollback。

### 類別二：Out-of-band Audit（DENIED / FAILURE / 敏感 READ）

這些**沒有**可搭載的業務交易（授權在 guard 就拒絕；或業務已 rollback）。

**MVP durable path（明確定義，非 best-effort logging）**：
- **Primary**：寫入 **durable BullMQ 佇列 `audit`**（Redis 持久化、retry + backoff、耗盡重試進 **dead-letter queue**）。Worker consumer 將其 `INSERT` 進 AuditLog（append-only）。跨程序重啟不遺失、失敗進 DLQ 待對帳。
- **Last-resort**：僅當 enqueue 本身因 **Redis 不可用**而失敗，才輸出含完整 audit payload 的 **structured ERROR log** 並觸發 ops 告警（可自 log pipeline 回收）。這是**降級路徑，非常態**。
- **不阻塞**使用者請求；at-least-once。

**MVP 範圍外（明確排除）**：WORM 儲存、SIEM 整合、獨立 audit database —— 現階段**不建**。

### Read Audit 範圍限制

只對**敏感資料／敏感操作**記錄 READ，**不對所有 GET** 產生 AuditLog（避免洪流）。MVP 白名單：
- 讀取**學生 PII 詳情**（`GET /students/:id`）
- 讀取**家長／監護人 PII**
- （未來）讀取**健康紀錄**
- 讀取**訊息內容**（`GET /messages`）

一般清單/GET（dashboard、班級清單、公告列表、通知列表）**不記錄 READ audit**。

### 四個 Case 的答案

- **Case A（業務成功、audit 失敗）**：對狀態變更操作**不可能發生** —— audit 在同一交易內，audit insert 失敗 → 整筆 rollback（業務也沒發生）。不允許「業務 commit 但無 transactional audit」。
- **Case B（授權 DENIED，無業務交易）**：guard 以 out-of-band 路徑寫 DENIED audit，經 fallback chain 保證至少一次；**永不阻塞** —— 拒絕回應照常返回。
- **Case C（業務 rollback）**：同交易的 audit 一併 rollback（不留假 SUCCESS）；另以 out-of-band 補一筆 **FAILURE** audit，記錄「曾嘗試且失敗」。
- **Case D（audit DB 寫入失敗）**：
  - Transactional audit → **fail 該請求**（業務一起 rollback）。安全且一致；因 audit DB == 業務 DB，這只在該校 DB 不健康時發生，屆時業務寫入本就失敗 —— **不擴大**故障面，也**不影響他校**。
  - Out-of-band audit → **不 fail 使用者請求**，走 fallback queue → WORM log → reconciler 回填。

## Alternatives Considered

- **Audit 全走 Outbox（async）**：DENIED/FAILURE 可能在系統異常時遺失，且與業務 commit 非原子，出現「業務成功但無 audit」。否決為狀態變更的主路徑（僅用於 out-of-band fallback）。
- **Audit 寫獨立 audit DB**：新增跨資料庫依賴與可用性面，且破壞與業務的原子性；違反「不因未來加基礎設施」。否決。
- **Audit 純 best-effort（失敗即丟）**：違反合規/可追溯需求。否決。

## Consequences

- (+) 狀態變更**永不**出現「有業務、無 audit」。
- (+) Audit 失敗**不會**癱瘓全系統（僅該請求、且僅該校 DB 已不健康時）。
- (+) DENIED/FAILURE/敏感 READ 以 durable BullMQ 佇列 + DLQ 保證不易遺失。
- (−) Out-of-band 需 durable BullMQ 佇列 + DLQ 對帳，**MVP 即建**（非延後）；WORM/SIEM 明確排除。
- Read audit 限敏感操作白名單，避免對一般 GET 產生洪流。
- append-only 於 DB 權限層強制（不授予 UPDATE/DELETE）；metadata 禁存敏感明文。
- 影響：01/03/05/06 文件更新；AuditService 定義兩條路徑。
