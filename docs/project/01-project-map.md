# 01 — Project Map

> **注意（Project Control Classification）**：以下 Phase 編號是**本專案控制文件新增的專案管理分類**，用於進度對齊；它**不是**原始 Architecture 文件裡的既定決策。Phase 0–4 為已完成/大致完成的歷史階段，**Phase 5 為目前階段**，Phase 6 以後為未來階段。
> 先前對話中的非正式「Step N」命名與此對應：Step 11 ＝ **Phase 5 — Project Skeleton**。

---

## Phase 0 — Product Definition  ✅
- **Purpose**：定義產品定位、核心資料單位、核心原則。
- **Main Tasks**：確立 Student-centered / SSoT / Event-driven / Config-driven / Backend-authoritative。
- **Entry**：無。 **Acceptance**：產品定義獲 Human Owner 確認。
- **Major Release**：無。 **Testing Scope**：無。
- **Exit**：定義凍結。 **Next**：Phase 1。

## Phase 1 — Technology Stack  ✅
- **Purpose**：鎖定技術棧。
- **Main Tasks**：Next.js/React/TS、NestJS、PostgreSQL、Prisma、Redis、BullMQ、Docker。
- **Acceptance**：技術棧凍結（不得自行更動）。 **Exit**：Stack 凍結。 **Next**：Phase 2。

## Phase 2 — Architecture  ✅
- **Purpose**：整體架構（Modular Monolith、DB-per-School、Multi-Instance、Control Plane、Runtime Config）。
- **Acceptance**：架構提案獲確認。 **Major Release**：無。 **Next**：Phase 3。

## Phase 3 — Domain / Database / RBAC / Event / API  ✅
- **Purpose**：Domain Model、Prisma schema、RBAC matrix、Event flow、API contract、MVP scope。
- **Deliverables**：[../02](../02-domain-model.md)~[../08](../08-mvp-scope.md)。
- **Acceptance**：各文件獲確認。 **Next**：Phase 4。

## Phase 4 — Architecture Gate  ✅
- **Purpose**：v1.1 Final Review，解決 5 個深水區問題。
- **Deliverables**：[../adr/ADR-001~005](../adr/)（Runtime Config、Attendance Ownership、Migration/Rollback、Secret Mgmt、Audit Reliability）+ 3 項 clarification。
- **Acceptance**：Human Owner 「Architecture v1.1 基本通過」。 **Exit**：Gate passed。 **Next**：Phase 5。

## Phase 5 — Project Skeleton  🟡（目前）
- **Purpose**：建立最小可運作 repo/app skeleton（非 MVP 功能）。
- **Main Tasks**：Monorepo、NestJS/Next.js/Worker bootstrap、Prisma baseline、Docker、CI baseline、Test baseline、`/health`、`/config/public`。
- **Entry**：Phase 4 passed。
- **Acceptance Criteria**：`pnpm install` + `db:generate` 成功；typecheck/test/build 綠燈（CI）；Vercel Preview 可開；Online `/health`、`/config/public`、web 首頁正常；**Human Owner 驗收**。
- **Major Release**：Foundation（見 [03-release-plan](./03-release-plan.md)）。
- **Testing Scope**：CI（install/generate/typecheck/test/build）+ Online availability/health/runtime-config。
- **Exit**：Human Acceptance 通過。 **Next**：Phase 6。

## Phase 6 — Vertical Slice  ⬜
- **Purpose**：跑通一條端到端流程：**LINE Login → User → Student → 權限 → LIFF Dashboard**。
- **Main Tasks**：DB migration + seed、LINE/LIFF 登入骨架、RBAC 骨架、一條讀取切片。
- **Entry**：Phase 5 accepted。 **Acceptance**：該流程 Online 可驗證 + Human Acceptance。
- **Major Release**：Identity / Authorization。 **Next**：Phase 7。

## Phase 7 — Core MVP  ⬜
- **Purpose**：完成 MVP 模組（Leave 狀態機、Attendance、Message Center、Announcement、Notification/LINE Push、Audit、Dashboard、Branding、Feature Flag）。
- **Entry**：Phase 6 accepted。 **Acceptance**：各模組 Online 驗收。
- **Major Release**：Leave / Attendance / Communication / Notification。 **Next**：Phase 8。

## Phase 8 — Integration / Hardening  ⬜
- **Purpose**：多校隔離、secret exposure、audit、錯誤處理、效能、ESLint（清 Technical Debt）。
- **Major Release**：MVP Release Candidate。 **Next**：Phase 9。

## Phase 9 — Pilot  ⬜
- **Purpose**：Test School 試營運，真實流程驗證。
- **Major Release**：Pilot。 **Next**：Phase 10。

## Phase 10 — Production  ⬜
- **Purpose**：多校批次部署、Control Plane 編排、migration/rollback 上線。
- **Major Release**：Production。 **Next**：Phase 11+。

## Phase 11+ — Future / V2+  ⬜
- **Purpose**：Health、Transportation/Bus、Report、AI、Subscription、Payment。
- **原則**：**不得**因出現在 Roadmap 就提前併入 MVP；需明確批准。以獨立 module + event + feature flag 加入。
