# 08 — Final MVP Scope (Revised, §5–6, §27–28)

## A. MVP 必做（第一版真正完成）

### Core Data（SoT）
- School, SchoolConfig, Class, Student
- User, LineIdentity（LINE 僅認證，修正 D）, UserRole
- Guardianship（多家長）, TeacherAssignment

### Platform
- LINE Login / LIFF 進入點
- RBAC（RolesGuard + ScopeGuard，後端授權）
- **Audit Log（core 架構，修正 C）**：誰/何時/資源/action/結果，覆蓋學生・家長・訊息・權限操作
- Card-based Dashboard（config-driven，後端過濾）
- Basic Branding、Basic Feature Flag
- `leaveRequiresApproval` 設定（修正 A）

### Communication（Student-centered，修正 D）
- Electronic Communication Book
- School / Class Announcement
- Message Center（Teacher ↔ Parent，多家長、已讀/未讀、分類；以 Student/Class/User 建立權限上下文，**不以 LINE ID 為業務關聯**）
- Notification（站內 + LINE Push 佇列，由 Worker 消費）

### Daily Operations
- Attendance（手動=SoT / Leave 事件=Derived）
- **Leave 狀態機**（修正 A）：PENDING/APPROVED/REJECTED/CANCELLED，config 決定是否審核

### Infra
- 單一 instance Docker（Web + API + Worker container set）
- Managed / 獨立 PostgreSQL（不與 app container 綁定）
- CI/CD、Migration、Backup、Health Check、Version Tracking、Rollback
- Transactional Outbox + BullMQ

## B. Architecture Reserved（修正 B — 只保留邊界與擴充點，不建空 module/空 schema）

未來 domain **不預先產生空殼**，僅以下列機制保留擴充能力：

| 未來 Domain | Domain Boundary（文件） | Extension Point |
|-------------|------------------------|-----------------|
| Health | 健康紀錄以 Student 為核心 | Feature flag `health`；未來 migration 建 schema |
| Transportation / Bus | 乘車名單、路線 | 已預留訂閱 `LeaveApproved`；flag `bus` |
| Report | 報表由既有資料聚合 | 訂閱 `AttendanceMarked` 等；flag `reports` |
| AI | 訊息草稿 / 摘要 | 訂閱 `MessageSent`；flag `ai` |
| Subscription / Payment | 方案與計費 | `requiredPlan` 欄位預留於 CardDescriptor |

> 需要時才以獨立 module + migration 加入；不建立無用途的空 table / 空 module（YAGNI）。

## C. Future Roadmap

GPS 追蹤、AI 聯絡簿/摘要/異常偵測、Reports、Event registration、Consent forms、相簿、Payment、Calendar。

## 架構護欄（Rule 1 / §6）

MVP 實作**不得**：把資料/權限/UI/功能寫死、讓 B/C 未來無法以獨立 module 加入、為求快速破壞 domain boundary 或事件架構。

新增功能標準路徑 (§32)：
```text
New Module → New Domain → New Events → New Permission → New Feature Flag
```
