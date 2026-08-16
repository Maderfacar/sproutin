# 06 — Event Flow (Revised, §3–4)

> 跨模組連動一律走事件 (Rule 8)，用 **Transactional Outbox** 保證 Single Source of Truth (§3)。
> **明確標示 SoT 與 Derived**（修正 E）。

## 1. 兩層事件通道

| 層 | 技術 | 用途 |
|----|------|------|
| **In-process** | NestJS EventEmitter2 | domain 內同步反應 |
| **Async / 跨模組副作用** | Outbox + BullMQ (Redis)，由 **Worker container** 消費 | 通知、LINE push、可靠交付 |

未來拆微服務時，把 Outbox 出口從 in-process 換成訊息佇列即可，業務碼不動 (§13)。

## 2. Leave 流程（修正 A — config-driven 狀態機）

```text
Parent → POST /leaves
   │  ── 單一 DB transaction ──
   ├─ INSERT Leave
   ├─ INSERT OutboxEvent(LeaveSubmitted)
   └─ 依 SchoolConfig.leaveRequiresApproval：
        ├─ false → Leave.status = APPROVED，INSERT OutboxEvent(LeaveApproved)
        └─ true  → Leave.status = PENDING（等待審核）
        │
        │  審核 PATCH /leaves/:id/status （TEACHER/ADMIN）
        │     ├─ APPROVED → OutboxEvent(LeaveApproved)
        │     └─ REJECTED → OutboxEvent(LeaveRejected)
        ▼
   Outbox Dispatcher（Worker/BullMQ）廣播
        ├─ LeaveSubmitted  → Notification(通知審核者/家長)
        ├─ LeaveApproved   → Attendance upsert(status=LEAVE, source=LEAVE_EVENT, sourceRef=leaveId, derivedFrom=leaveId)  ← Derived
        │                  → 若目標列已 override(source=MANUAL) → 不覆寫，發衝突通知
        │                  → Notification（家長/老師）
        ├─ LeaveRejected   → 回滾（見下）+ Notification
        └─ LeaveCancelled  → 回滾（見下）+ Notification
```

**回滾規則（override 感知，ADR-002）**：
- 僅還原 `source=LEAVE_EVENT AND sourceRef=thisLeave` 的列（刪除/改回）。
- 已 override（`source=MANUAL AND derivedFrom=thisLeave`）的列**不觸碰** → 發 `Notification` + `AuditLog(action="attendance.override_conflict")` 請老師覆核。

**SoT / Derived 標記**：
- **Leave = SoT**（請假意圖）。
- **Attendance(source=LEAVE_EVENT) = Derived**；override 後轉 MANUAL、所有權轉移。
- **Notification = Derived**。

## 3. 為什麼用 Outbox

- 「業務資料 + outbox event」寫在**同一 DB transaction** → 不會出現「請假成功但衍生資料沒更新」。
- Dispatcher 保證 at-least-once；handler 須 **idempotent**（Attendance 用 `@@unique([studentId,date])` upsert；回滾以 `sourceRef` 定位）。

## 4. MVP 事件清單

| Event | 發出者 | 訂閱者 (MVP) | 未來訂閱點（修正 B，不建空 module） |
|-------|--------|-------------|-----------------|
| `LeaveSubmitted` | Leave | Notification | — |
| `LeaveApproved` | Leave | Attendance, Notification | Transportation |
| `LeaveRejected` | Leave | Attendance(回滾), Notification | — |
| `LeaveCancelled` | Leave | Attendance(回滾), Notification | Transportation |
| `MessageSent` | Message | Notification | AI(draft/summary) |
| `AnnouncementPublished` | Announcement | Notification, **LINE Push**（階段2 刀5） | — |
| `AttendanceMarked` | Attendance | Notification(選配) | Report |

## 5. Audit 可靠性（修正 C；ADR-005）

Audit 分兩條路徑，皆非 best-effort：

**A. Transactional audit（狀態變更操作）**：AuditLog 與業務變更寫在**同一 DB transaction**（同校 DB）。原子 → 不會「業務成功但無 audit」。audit insert 失敗 → 整筆 rollback。因 audit DB == 業務 DB，**不新增可用性依賴**，且不影響他校。

**B. Out-of-band audit（DENIED / FAILURE / 敏感 READ）**：無業務交易可搭載。**MVP durable path**：寫入 **durable BullMQ 佇列 `audit`**（Redis 持久化 + retry/backoff + **DLQ**），Worker consumer INSERT 進 AuditLog。僅當 Redis 不可用致 enqueue 失敗，才降級輸出 structured ERROR log + ops 告警。**永不阻塞**使用者請求，at-least-once。**MVP 排除** WORM/SIEM/獨立 audit DB。

- 記錄：actor（誰）、createdAt（何時）、resourceType/resourceId（哪個資源）、action、result（SUCCESS/FAILURE/DENIED）、scope、metadata。
- **Read audit 限敏感操作白名單**（學生/家長 PII 詳情、未來健康、訊息內容）；一般清單/GET 不記錄。
- append-only 由 DB 權限強制（app role 無 UPDATE/DELETE）；不記錄敏感明文。

## 6. 擴充原則 (§6, §32)

新模組加入時：**訂閱既有事件** 或 **發出新事件**，不修改既有模組 business logic。未來模組（Health/Bus/AI/Report/Payment）在需要時才建立，透過上表「未來訂閱點」與 Feature Flag 接入——**MVP 不預先產生空 module**。
