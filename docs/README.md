# Sproutin — 架構與規劃文件 (SSoT)

> 本目錄是 Sproutin 專案的 **Single Source of Truth**。所有架構決策以此為準。
> 任何實作若與此處衝突,應先修改文件並說明「為什麼」,再改程式碼。

## 文件索引

| # | 文件 | 內容 | 對應 Master Prompt |
|---|------|------|-------------------|
| 00 | [overview.md](./00-overview.md) | 產品定位、核心概念、開發鐵則 | §1–6, §29–32 |
| 01 | [architecture.md](./01-architecture.md) | 整體架構、Monorepo、執行期拓樸、Control Plane | §2, §12–13, §19–20, §31 |
| 02 | [domain-model.md](./02-domain-model.md) | Domain 聚合、身分分離、關係模型 | §2–3, §17 |
| 03 | [database-schema.md](./03-database-schema.md) | Prisma schema、核心模型、擴充預留 | §14–16, §24–26 |
| 04 | [module-structure.md](./04-module-structure.md) | NestJS / Next.js 模組切分 | §7–8, §12 |
| 05 | [rbac-matrix.md](./05-rbac-matrix.md) | 角色權限矩陣、Scope 限縮 | §17–18 |
| 06 | [event-flow.md](./06-event-flow.md) | Event-driven、Transactional Outbox | §3–4 |
| 07 | [api-contract.md](./07-api-contract.md) | API 端點、回應信封、驗證 | §11, §18 |
| 08 | [mvp-scope.md](./08-mvp-scope.md) | MVP 必做 / 架構保留 / 未來 | §5–6, §27–28 |
| 09 | [deployment.md](./09-deployment.md) | Docker、CI/CD、Migration、Rollback | §21–23 |
| — | [adr/](./adr/) | Architecture Decision Records（ADR-001~005，v1.1 review） | Review v1.1 |
| — | [project/](./project/) | **Project Control Documentation**（進度/驗收/Release/測試/工作邊界；三方對齊） | Project mgmt |

> **兩層文件**：`docs/00-09 + adr/` 是 **Architecture SSoT**（系統長什麼樣）；`docs/project/` 是 **Project Control**（進度、驗收、Release、測試、Human 準備、Claude 工作規則）。前者描述系統，後者管理流程。

## 已確認的關鍵決策 (2026-08-11)

1. **Control Plane**：輕量 Control Plane，僅管理 infrastructure metadata（Instance、版本、部署狀態、環境設定參照）；**不存任何業務資料**；DB credentials 一律為 **secret reference**，不存明文。
2. **部署目標**：Docker，每校獨立 Instance，同一 Build Artifact 部署到不同 School Instance；Web/API/**Worker** 為一組 container set；**PostgreSQL 採 Managed / 獨立 DB**，不與 app container 綁定；須支援 CI/CD、Migration、Backup、Health Check、Version Tracking、Rollback。
3. **開發流程**：**先文件 → 確認 → 再骨架**。暫不大量產生 implementation code。

## Architecture Proposal 修正 (2026-08-11)

- **A. Leave Flow**：`POST /leaves` 不再固定 Approved；改為狀態機 `PENDING/APPROVED/REJECTED/CANCELLED`，由 `SchoolConfig.leaveRequiresApproval` 決定是否審核。
- **B. Reserved Modules**：不建大量空 module/空 schema；改以 Domain Boundary（文件）+ Event 訂閱點 + Feature Flag 保留擴充。
- **C. Audit Log**：納入核心架構，append-only，記錄誰/何時/資源/action/結果，覆蓋學生・家長・健康・訊息操作。
- **D. Message Center**：維持 Student-centered；業務關聯以 Student/Class/User，**不以 LINE User ID**。
- **E. Data Consistency**：Schema 與 Event Flow 明確標示 SoT 與 Derived。

## Architecture v1.1 Final Review (2026-08-11)

五項深水區問題已解決，詳見 ADR：

| ADR | 議題 | 決策摘要 |
|-----|------|----------|
| [ADR-001](./adr/ADR-001-runtime-configuration.md) | Runtime Config / LIFF 多校 | per-school 值 runtime 取得，bundle 零 per-school 值；same-origin `/api/public-config` |
| [ADR-002](./adr/ADR-002-attendance-derived-data-ownership.md) | Attendance 衍生資料所有權 | 人工修改 → 轉 MANUAL 所有權轉移；取消不覆蓋人工結果，發衝突通知 |
| [ADR-003](./adr/ADR-003-database-migration-rollback.md) | Migration / Rollback | Expand/Migrate/Contract；image rollback vs forward-fix vs restore 決策矩陣 |
| [ADR-004](./adr/ADR-004-secret-management.md) | Secret 管理 | Control Plane 只存 secret **reference**；真值在 Secret Manager |
| [ADR-005](./adr/ADR-005-audit-reliability.md) | Audit 可靠性 | 狀態變更=transactional；DENIED/FAILURE=out-of-band + fallback chain |
| [ADR-006](./adr/ADR-006-deployment-hosting.md) | 部署位置 | 架構不變；Vercel(Web) + Render(API+Worker) + Managed Redis + Managed PostgreSQL |

## 十二條開發鐵則 (Master Prompt §29)

1. 不為 MVP 破壞未來架構
2. 不過度工程化
3. 核心 Domain 保持清楚
4. Business Logic 不寫在 UI Component
5. Frontend 不自行決定 Authorization
6. 所有重要權限由 Backend 驗證
7. 核心資料只維護一次 (Single Source of Truth)
8. 跨模組更新優先用 Event-driven
9. Schema 必須透過 Migration 管理
10. 所有學校共用同一份 Codebase
11. 每間學校資料庫必須獨立
12. 新功能以獨立 Module 加入
