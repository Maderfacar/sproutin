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
| `LeaveApproved` | Leave | Attendance, Notification, **Transportation（乘車名單移除）**（⑦ 刀1） | — |
| `LeaveRejected` | Leave | Attendance(回滾), Notification, **Transportation(還原)**（⑦ 刀1） | — |
| `LeaveCancelled` | Leave | Attendance(回滾), Notification, **Transportation(還原)**（⑦ 刀1） | — |
| `MessageSent` | Message | Notification | AI(draft/summary) |
| `AnnouncementPublished` | Announcement | Notification, **LINE Push**（階段2 刀5） | — |
| `AttendanceMarked` | Attendance | Notification(選配) | Report |
| `CommunicationBookPublished` | CommunicationBook | Notification（全部送出者的家長）、**LINE Push（僅 `pushStudentIds`）**（階段2 刀4） | Health, Report |
| `PushCampaignQueued` | PushCampaign | **LINE Push（Flex 卡片）**（階段3） | — |

> `CommunicationBookPublished` 的推播刻意**不是全部收件人**：payload 帶 `studentIds`（本次送出）與
> `pushStudentIds`（老師勾選要立即 LINE 通知者，通常是健康需注意的孩子）。日常記錄若全班推播，
> 一班 25 人每天就是 25 則 LINE 訊息，費用與打擾都不成比例（Human Owner 決策 2026-08-17）。
> 老師不必自行判斷「算不算緊急」——體溫偏高或有症狀者由系統於送出時自動挑出並詢問。

> `PushCampaignQueued` 的 payload **只帶 campaignId**（內容已在 PushCampaign，複製進事件就有兩個版本），
> 收件人也不放進 payload —— worker 送出時**重新解析一次**才是真相（建立與送出之間可能有人剛完成綁定）。
>
> **這個事件是唯一「handler 失敗不自動重試」的事件**（階段3，刻意）：其他事件重試最多讓一位家長
> 收到重複訊息；群發一次是全校兩百則，自動重試等於再收一次費用、讓已收到的家長再收一次。
> 因此 handler 把實際結果（送出／略過的則數 + 失敗原因）寫進 `PushCampaign` 並標 `FAILED`，
> **不丟出**，由園長在後台看見「只送到 150 位」後自行決定是否重發。狀態、數字與原因都留下 →
> 這不是沉默降級。同理，handler 看到 `status !== 'QUEUED'` 即視為重放並直接略過
> （`resetStaleProcessing` 會在 worker 重啟時重放事件，而群發的 idempotency 比什麼都重要）。

## 5. Audit 可靠性（修正 C；ADR-005）

Audit 分兩條路徑，皆非 best-effort：

**A. Transactional audit（狀態變更操作）**：AuditLog 與業務變更寫在**同一 DB transaction**（同校 DB）。原子 → 不會「業務成功但無 audit」。audit insert 失敗 → 整筆 rollback。因 audit DB == 業務 DB，**不新增可用性依賴**，且不影響他校。

**B. Out-of-band audit（DENIED / FAILURE / 敏感 READ）**：無業務交易可搭載。**MVP durable path**：寫入 **durable BullMQ 佇列 `audit`**（Redis 持久化 + retry/backoff + **DLQ**），Worker consumer INSERT 進 AuditLog。僅當 Redis 不可用致 enqueue 失敗，才降級輸出 structured ERROR log + ops 告警。**永不阻塞**使用者請求，at-least-once。**MVP 排除** WORM/SIEM/獨立 audit DB。

- 記錄：actor（誰）、createdAt（何時）、resourceType/resourceId（哪個資源）、action、result（SUCCESS/FAILURE/DENIED）、scope、metadata。
- **Read audit 限敏感操作白名單**（學生/家長 PII 詳情、未來健康、訊息內容）；一般清單/GET 不記錄。
- append-only 由 DB 權限強制（app role 無 UPDATE/DELETE）；不記錄敏感明文。

## 6. 擴充原則 (§6, §32)

新模組加入時：**訂閱既有事件** 或 **發出新事件**，不修改既有模組 business logic。未來模組（Health/Bus/AI/Report/Payment）在需要時才建立，透過上表「未來訂閱點」與 Feature Flag 接入——**MVP 不預先產生空 module**。

## 7. Transportation 訂閱（⑦ 娃娃車刀1，2026-08-18）

「請假自動從乘車名單移除」是本專案第一個把**未來訂閱點兌現**的案例，值得記下它怎麼落地的：

```text
leaves/ 底下一行都沒有動。
新增 events/bus-event.handler.ts 訂閱既有的 LeaveApproved / LeaveRejected / LeaveCancelled，
在 event-handlers.service.ts 的同一個 case 內多呼叫一個 handler 而已。
娃娃車要不要接、什麼時候接、接了做什麼，完全是娃娃車自己的事（§6 擴充原則）。
```

**語意刻意與 Attendance 的投影（ADR-002）一致**，因為問題是同一個：

| 事件 | 娃娃車的動作 | override 感知 |
|------|-------------|--------------|
| `LeaveApproved` | 逐日 × 逐方向 upsert `BusRide(status=ABSENT, source=LEAVE_EVENT, sourceRef=leaveId)` | 該筆已是 `source=MANUAL`（老師點過）→ **不覆寫**，計入 `skipped` |
| `LeaveRejected` / `LeaveCancelled` | 只刪除 `source=LEAVE_EVENT AND sourceRef=thisLeave` 的列 | 老師手動記過的不觸碰 |

孩子早上明明已經上了車、家長才補請假 —— 這時把紀錄蓋成「今日未搭」就是把事實抹掉。
爭議發生時要拿出來的正是那筆老師手動點的紀錄。

隨車老師的名單另有一道**補網**：點名畫面除了認 `BusRide(ABSENT/LEAVE_EVENT)`，
也認當日 `Attendance` 為 `LEAVE/ABSENT`（沿用聯絡簿老師端的同一條規則）。
涵蓋「先請假、之後才被排進娃娃車」——事件發生當下還沒有名單可寫。
