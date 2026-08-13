# 03 — Release Plan

> 每個 Release 含 10 節：Objective / Included / Excluded / Architecture Deps / Data Deps / Security Checks / Functional Tests / Online Acceptance / Rollback / Acceptance Criteria。
> **Future domains（Health、Transportation/Bus、Report、AI、Subscription、Payment）不得因出現在 Roadmap 就提前併入 MVP**，除非另有明確批准。

---

## R1 — Foundation（對應 Phase 5）
1. **Objective**：可部署、可觀測的最小骨架跑起來。
2. **Included**：Monorepo、Web/API/Worker skeleton、`/health`、`/config/public`、runtime config、CI、Test baseline、Docker。
3. **Excluded**：所有 business feature、DB migration、登入。
4. **Architecture Deps**：ADR-001（runtime config）。
5. **Data Deps**：無（`/config/public` 先回 env 最小值）。
6. **Security Checks**：public config 不含 secret / API_INTERNAL_URL。
7. **Functional Tests**：health spec（CI）。
8. **Online Acceptance**：Preview 首頁、`/health`、`/config/public`。
9. **Rollback**：無 DB 變更 → image rollback 即可。
10. **Acceptance Criteria**：CI 綠燈 + Online 三項通過 + Human Acceptance。 **Status**：VERIFICATION_PENDING。

## R2 — Identity / Authorization（對應 Phase 6）
1. **Objective**：LINE Login → User → Student → 權限 → LIFF Dashboard 端到端。
2. **Included**：DB migration + seed、LINE/LIFF 登入、JWT、RolesGuard/ScopeGuard、Dashboard 讀取切片。
3. **Excluded**：Leave/Attendance/Message 寫入功能。
4. **Architecture Deps**：RBAC（../05）、Runtime config、Auth（../07-api-contract）。
5. **Data Deps**：Demo School/Class/Student/User/Guardianship/TeacherAssignment seed。
6. **Security Checks**：Backend authoritative、row-level scope、parent/teacher isolation、LINE ID 僅認證。
7. **Functional Tests**：guard 單元/整合測試。
8. **Online Acceptance**：真實 LINE 帳號登入 → 看到自己小孩/自己班。
9. **Rollback**：expand-only migration → image rollback；否則 forward-fix（ADR-003）。
10. **Acceptance Criteria**：端到端 Online 通過 + Human Acceptance。

## R3 — Leave（Phase 7）
1. **Objective**：請假狀態機（config-driven 審核）。
2. **Included**：PENDING/APPROVED/REJECTED/CANCELLED、`leaveRequiresApproval`、LeaveSubmitted/Approved/Rejected/Cancelled 事件、Outbox。
3. **Excluded**：Attendance 投影細節（見 R4）以外的下游、AI。
4. **Architecture Deps**：Event-driven、Transactional Outbox、Audit。
5. **Data Deps**：學生/家長/班級 seed。
6. **Security Checks**：家長只能為自己小孩申請；審核限 TEACHER/ADMIN。
7. **Functional Tests**：狀態轉移、非法轉移 409。
8. **Online Acceptance**：家長申請 → 審核 → 狀態正確。
9. **Rollback**：ADR-003 分類。
10. **Acceptance Criteria**：Online + Human Acceptance。

## R4 — Attendance（Phase 7）
1. **Objective**：出缺勤（手動 + Leave 事件投影）+ **雙 SoT 衝突規則**。
2. **Included**：MANUAL/LEAVE_EVENT、sourceRef/derivedFrom/overriddenAt/overriddenBy、override 政策（ADR-002）。
3. **Excluded**：報表。
4. **Architecture Deps**：ADR-002、Event-driven。
5. **Data Deps**：Leave/Attendance 測試情境。
6. **Security Checks**：老師限自班。
7. **Functional Tests**：LeaveApproved 投影、override 後 LeaveCancelled 不覆蓋、衝突通知。
8. **Online Acceptance**：模擬「投影→老師改→家長取消」不覆蓋人工結果。
9. **Rollback**：ADR-003。
10. **Acceptance Criteria**：衝突規則 Online 驗證 + Human Acceptance。

## R5 — Communication（Phase 7）
1. **Objective**：Message Center + Announcement（Student-centered）。
2. **Included**：Teacher↔Parent、多家長、已讀/未讀、分類、School/Class Announcement。
3. **Excluded**：AI 草稿/摘要、附件、排程訊息。
4. **Architecture Deps**：RBAC scope、MessageSent 事件。
5. **Data Deps**：班級/家長/學生關係。
6. **Security Checks**：以 Student/Class/User 建立權限，**非 LINE ID**；parent isolation。
7. **Functional Tests**：送訊、已讀、scope 過濾。
8. **Online Acceptance**：家長/老師互傳、隔離正確。
9. **Rollback**：ADR-003。
10. **Acceptance Criteria**：Online + Human Acceptance。

## R6 — Notification / LINE Push（Phase 7）
1. **Objective**：站內通知 + LINE Push（Worker 消費）。
2. **Included**：Notification（Derived）、BullMQ push、out-of-band audit durable path。
3. **Excluded**：模板化行銷訊息。
4. **Architecture Deps**：Outbox、Worker、Redis/BullMQ、ADR-005。
5. **Data Deps**：LINE OA push 目標。
6. **Security Checks**：只推給有權限的關係人。
7. **Functional Tests**：事件 → 通知 → push 佇列；DLQ。
8. **Online Acceptance**：真實 LINE 收到 push。
9. **Rollback**：佇列 idempotent；ADR-003。
10. **Acceptance Criteria**：Online push 收到 + Human Acceptance。**依賴 Worker hosting Architecture Question 之決議。**

## R7 — MVP Release Candidate（Phase 8）
1. **Objective**：整合、hardening、可試營運。
2. **Included**：R1–R6 整合、多校隔離、audit、錯誤處理、**ESLint（清 Technical Debt）**、效能。
3. **Excluded**：所有 Future domains。
4. **Architecture Deps**：全部既有 + Control Plane 單校流程。
5. **Data Deps**：完整 demo dataset。
6. **Security Checks**：multi-school isolation、secret exposure、audit 覆蓋、mobile UI。
7. **Functional Tests**：全 MVP 回歸。
8. **Online Acceptance**：[04-test-matrix](./04-test-matrix.md) 全表通過。
9. **Rollback**：ADR-003 全套 + backup/PITR。
10. **Acceptance Criteria**：Test Matrix 全綠 + Human Acceptance。

## R8 — Pilot（Phase 9）
1. **Objective**：Test School 真實試營運。 2. Included：RC + 監控。 3. Excluded：多校量產。
4. Deps：單校 Managed PG/Redis。 5. Data：真實但最小化（優先 synthetic）。 6. Security：隱私、兒童資料最小化。
7–8. Tests/Online：真實使用者流程。 9. Rollback：per-instance PITR。 10. Acceptance：Pilot 回饋 + Human Acceptance。

## R9 — Production（Phase 10）
1. **Objective**：多校批次上線。 2. Included：Control Plane 批次編排、migration runner、rollback。 3. Excluded：Future domains。
4. Deps：Instance Registry、secret refs。 5. Data：各校獨立 DB。 6. Security：全面。
7–8. Tests/Online：分批 health-gated。 9. Rollback：分類（image/forward-fix/PITR）。 10. Acceptance：分批通過 + Human Acceptance。
