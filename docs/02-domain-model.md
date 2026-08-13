# 02 — Domain Model (Revised)

以 **Student 為核心聚合**。身分（LINE / System User）與資料實體徹底分離 (§17)。

## 1. 身分分離（最重要，對應修正 D）

```text
LineIdentity (lineUserId)  ──1:1──▶  User (系統帳號)
                                       │
                                       └──▶ UserRole (可多角色，帶 scope)
```

**原則**：
- **LINE User ID 僅供「認證」**，**不得**作為任何業務關聯的主鍵或外鍵。
- 業務關係一律以 **Student / Class / User relationship** 建立（見修正 D — Message Center）。
- 學生**不登入**，不是 User。家長 / 老師 / 行政 / 園長才是 User。
- 一人可有多角色（例：A 校老師 + 自己孩子的家長）。

## 2. 核心關係圖

```text
School ─1:*─ Class ─1:*─ Student
                            │
   ┌────────────────────────┼────────────────────────┐
   │ Guardianship (*:*)      │ TeacherAssignment (*:*)  │ 衍生資料 (1:*)
   ▼                         ▼                         ▼
 User(Parent/Guardian)     User(Teacher)          Attendance, Leave,
 帶 relation + isPrimary   帶 class + teacherRole  Message, Announcement...
```

## 3. Source of Truth 標示（對應修正 E）

| Domain 資料 | 性質 | 來源 |
|-------------|------|------|
| School / Class / Student / User / Guardianship / TeacherAssignment | **SoT** | 主資料，直接維護 |
| **Leave** | **SoT** | 請假意圖的唯一真實來源 |
| Attendance (`source=MANUAL`) | **SoT** | 老師手動標記 |
| Attendance (`source=LEAVE_EVENT`) | **Derived** | 由 `LeaveApproved` 事件投影而來，非手動維護 |
| Message / MessageRead / Announcement | **SoT** | 直接維護 |
| Notification | **Derived** | 由各事件衍生 |
| **AuditLog** | **SoT (append-only)** | 操作紀錄的唯一來源，只增不改 |
| SchoolConfig | **SoT** | branding / feature flag / 審核設定 |
| Dashboard cards | **Derived** | 讀取時依 config + role 動態產生 |

> 規則：**同一份核心資料只有一個 SoT**。Derived 資料**不得**被手動改寫，只能由事件重新產生 (§3, Rule 7)。

## 4. Leave 狀態機（對應修正 A）

Leave **不是**「一提交就 Approved」。狀態由 **SchoolConfig.leaveRequiresApproval** 決定流程：

```text
POST /leaves
   │  emit LeaveSubmitted（一律）
   ├─ leaveRequiresApproval = false → status = APPROVED（同 tx，emit LeaveApproved）
   └─ leaveRequiresApproval = true  → status = PENDING（通知審核者）
                                          │
                          審核 PATCH /leaves/:id/status
                             ├─ APPROVED → emit LeaveApproved
                             └─ REJECTED → emit LeaveRejected

家長取消：PENDING/APPROVED → CANCELLED → emit LeaveCancelled
```

- 狀態 enum：`PENDING / APPROVED / REJECTED / CANCELLED`。
- 「Submitted」是**事件**（發生的動作），不是持久化狀態；持久化狀態用上述 enum。
- **只有 `APPROVED` 才會投影出 Attendance**（source=LEAVE_EVENT）。`REJECTED / CANCELLED` 若先前已投影，依 override 政策回滾（見 §4b）。

## 4a. 正式 Domain Rule：Leave / Attendance 雙 SoT 語意（ADR-002）

> 這是**正式 Domain Rule**，所有相關實作必須遵守：

1. **Leave = 家長提出的請假意圖／請假事實的 Source of Truth。**
2. **Attendance = 園方認定的實際出勤狀態的 Source of Truth。**
3. `LeaveApproved` **可以**產生 `Attendance(source=LEAVE_EVENT)` 的 **Derived Record**。
4. 若教師後續人工修改該 Derived Record，**Attendance ownership 轉為 MANUAL**。
5. `LeaveCancelled` / `LeaveRejected` **不得覆蓋 MANUAL Attendance**。
6. **因此 Leave 與 Attendance 在某些情況下可以合法地不一致** —— 系統**不以「強制永久一致」為目標**。
7. 衝突應透過 **notification / audit / review** 機制**浮現**，而**不是靜默覆蓋**。

> 兩者是**各自領域的 SoT**：Leave 是「家長說了什麼」的真相；Attendance 是「園方認定實際到校」的真相。事件是兩者的橋樑（投影），不是強制同步器。

## 4b. Derived Attendance Ownership / Override 政策（ADR-002）

Derived Attendance 可能被老師人工修改；之後 Leave 取消時**不得覆蓋人工結果**。政策：

| 問題 | 決策 |
|------|------|
| 允許人工改 Derived？ | 允許 |
| 改後 source？ | 轉 `MANUAL`，記 `overriddenAt/overriddenBy`，保留 `derivedFrom`（血緣） |
| override 後 LeaveCancelled 能回滾？ | **不能**——事件只擁有仍為 `LEAVE_EVENT` 的列 |
| 不能回滾怎麼辦？ | 該列不觸碰；發 **Notification + AuditLog**（`attendance.override_conflict`）請老師覆核 |
| SSoT 如何維持？ | 每列由 `source` 決定**唯一擁有者**；override = 所有權明確轉移且可稽核，無雙寫 |

欄位：`source`（當前擁有者）、`sourceRef`（active 來源 Leave）、`derivedFrom`（血緣，override 後保留）、`overriddenAt`、`overriddenBy`。

## 5. 關鍵實體

| 實體 | 說明 |
|------|------|
| **Student** | 核心聚合根，**不是 User** |
| **User / LineIdentity** | 帳號與 LINE 身分 1:1；LINE ID 僅認證用 |
| **UserRole** | 帶 scopeType/scopeId（限某班） |
| **Guardianship** | User(家長)↔Student，relation + isPrimary（多家長，§17） |
| **TeacherAssignment** | User(老師)↔Class，teacherRole |
| **Leave** | SoT，狀態機 + config 審核 |
| **Attendance** | 混合：手動=SoT / 事件=Derived（靠 `source` 區分） |
| **Message** | Student-centered，關聯 student/class/sender |
| **Announcement / Notification** | 公告 / 站內通知 |
| **AuditLog** | append-only 操作稽核（對應修正 C） |
| **SchoolConfig** | branding + feature flags + leaveRequiresApproval |

## 6. Audit（對應修正 C）

`AuditLog` 記錄：**誰 / 何時 / 對哪個資源 / 執行什麼 Action / 結果**。重點覆蓋學生資料、家長資料、健康資料（未來）、訊息操作。詳見 [03-database-schema](./03-database-schema.md) 與 [06-event-flow](./06-event-flow.md)。

## 7. 擴充點（對應修正 B）

MVP **不建立**大量空 module。未來模組（Health / Bus / AI / Report / Payment）透過三種既有機制擴充，不需預先產生空殼：
1. **Domain Boundary**：以文件定義各未來 domain 的邊界（見 [08-mvp-scope](./08-mvp-scope.md)）。
2. **Event 訂閱點**：既有事件（`LeaveApproved` / `MessageSent` / `AttendanceMarked`）已可被未來模組訂閱。
3. **Feature Flag**：`SchoolConfig.featureFlags` 控制未來功能開關。

> 不預先建立無用途的空 schema / 空 module（YAGNI）。需要時才以獨立 module 加入 (§32)。

## 8. 跨校身分

因每校獨立 DB (§19)，同一 LINE 使用者若橫跨兩校，在兩 DB 各有一筆 User。跨校統一由 Control Plane 層處理，不影響各校 domain。
