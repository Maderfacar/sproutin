# 03 — Database Schema (Revised, Prisma)

> 單一 schema，部署到 N 個獨立 DB (§19)。所有變更透過 Migration (Rule 9)。
> 核心關聯**不得**為無結構 JSON blob (§14)。

## 設計慣例

- id 用 `cuid()`。
- **SoT / Derived 標示**（修正 E）：每個 model 註明是唯一真實來源，或由事件衍生。
- Derived 資料不得手動改寫，只能由事件重新產生。
- **不建立無用途的空 model**（修正 B）：Health/Bus 等未來資料等實作時再以 migration 加入。

## SoT / Derived 對照（修正 E）

| Model | 性質 | 備註 |
|-------|------|------|
| School, SchoolConfig, Class, Student, User, LineIdentity, UserRole, Guardianship, TeacherAssignment | **SoT** | 主資料 |
| Leave | **SoT** | 請假意圖唯一來源 |
| Attendance | **混合** | `source=MANUAL`→SoT；`source=LEAVE_EVENT`→Derived。override 後所有權轉 MANUAL（ADR-002） |
| Message, MessageRead, Announcement | **SoT** | |
| Notification | **Derived** | 由事件產生 |
| AuditLog | **SoT (append-only)** | 只增不改不刪 |
| OutboxEvent | 基礎設施 | 事件可靠交付 |

## 核心 Schema（各校 DB）

```prisma
// ---------- 租戶 / 組織（SoT）----------
model School {
  id        String        @id @default(cuid())
  name      String
  classes   Class[]
  config    SchoolConfig?
  createdAt DateTime      @default(now())
}

model SchoolConfig {
  id                   String  @id @default(cuid())
  schoolId             String  @unique
  school               School  @relation(fields: [schoolId], references: [id])
  brandName            String
  logoUrl              String?
  primaryColor         String  @default("#2E7D32")
  secondaryColor       String  @default("#A5D6A7")
  bannerUrl            String?
  cardOrder            Json    // Dashboard card 排序 (§25)
  featureFlags         Json    // { ai:false, health:false, bus:false, ... } (§26)
  leaveRequiresApproval Boolean @default(true) // 修正 A：請假是否需審核
  // --- 公開 runtime config（非機密，供 /config/public，ADR-001）---
  liffId               String? // 該校 LIFF ID（公開）
  lineOaChannelId      String? // LINE OA 公開 channel id
  lineOaBasicId        String? // LINE OA @basic id（公開）
  apiBaseUrl           String? // 瀏覽器面 API base（公開；預設 same-origin）
  // 機密（channel secret / access token / JWT）不在此，由 secret manager 注入 env (ADR-004)
}

model Class {
  id       String              @id @default(cuid())
  schoolId String
  school   School              @relation(fields: [schoolId], references: [id])
  name     String
  students Student[]
  teachers TeacherAssignment[]
}

// ---------- 學生（核心聚合根，SoT）----------
model Student {
  id            String         @id @default(cuid())
  classId       String
  class         Class          @relation(fields: [classId], references: [id])
  name          String
  status        StudentStatus  @default(ACTIVE)
  guardianships Guardianship[]
  attendances   Attendance[]
  leaves        Leave[]
  messages      Message[]
  createdAt     DateTime       @default(now())
}

// ---------- 身分 / 使用者（SoT；LINE ID 僅認證，修正 D）----------
model User {
  id           String              @id @default(cuid())
  displayName  String
  // 帳號啟用狀態（Phase 9 階段2 刀3，migration 0004，expand-only）。
  // 停用＝不得登入（AuthService 於 login 與 /me 兩處擋）；**帳號不刪除**，
  // 否則其建立的請假／訊息／稽核紀錄會失去歸屬。
  status       UserStatus          @default(ACTIVE) // ACTIVE | INACTIVE
  lineIdentity LineIdentity?
  roles        UserRole[]
  guardianOf   Guardianship[]
  teaching     TeacherAssignment[]
  createdAt    DateTime            @default(now())
}

model LineIdentity {
  id         String @id @default(cuid())
  lineUserId String @unique // 僅供認證；不得作為業務外鍵
  userId     String @unique
  user       User   @relation(fields: [userId], references: [id])
}

model UserRole {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  role      Role
  scopeType ScopeType @default(SCHOOL)
  scopeId   String?
  @@unique([userId, role, scopeType, scopeId])
}

model Guardianship {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  studentId String
  student   Student          @relation(fields: [studentId], references: [id])
  relation  GuardianRelation
  isPrimary Boolean          @default(false)
  @@unique([userId, studentId])
}

model TeacherAssignment {
  id      String      @id @default(cuid())
  userId  String
  user    User        @relation(fields: [userId], references: [id])
  classId String
  class   Class       @relation(fields: [classId], references: [id])
  role    TeacherRole @default(HOMEROOM)
  @@unique([userId, classId, role])
}

// ---------- Leave（SoT）+ 狀態機（修正 A）----------
model Leave {
  id        String      @id @default(cuid())
  studentId String
  student   Student     @relation(fields: [studentId], references: [id])
  dateFrom  DateTime
  dateTo    DateTime
  reason    String
  status    LeaveStatus @default(PENDING) // PENDING/APPROVED/REJECTED/CANCELLED
  reviewedBy String?    // 審核者 userId（若需審核）
  reviewNote String?
  createdBy String       // 申請者 userId
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}

// ---------- Attendance（混合 SoT/Derived + override 政策，ADR-002）----------
model Attendance {
  id           String           @id @default(cuid())
  studentId    String
  student      Student          @relation(fields: [studentId], references: [id])
  date         DateTime
  status       AttendanceStatus
  source       AttendanceSource @default(MANUAL) // 當前擁有者：MANUAL=SoT / LEAVE_EVENT=Derived
  sourceRef    String?          // source=LEAVE_EVENT 時的 active 來源 Leave.id
  derivedFrom  String?          // 原始 Leave 血緣；override 後仍保留（衝突偵測/稽核）
  overriddenAt DateTime?        // 由 Derived 被人工覆寫的時間
  overriddenBy String?          // 覆寫者 userId
  @@unique([studentId, date])
}

// ---------- 溝通（Student-centered，修正 D）----------
model Message {
  id        String          @id @default(cuid())
  studentId String          // 業務關聯以 Student 為核心，非 LINE ID
  student   Student         @relation(fields: [studentId], references: [id])
  classId   String
  senderId  String          // userId
  category  MessageCategory @default(GENERAL)
  body      String
  reads     MessageRead[]
  createdAt DateTime        @default(now())
}

model MessageRead {
  id        String   @id @default(cuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id])
  userId    String
  readAt    DateTime @default(now())
  @@unique([messageId, userId])
}

model Announcement {
  id        String            @id @default(cuid())
  schoolId  String
  classId   String?           // null = 全校
  scope     AnnouncementScope
  title     String
  body      String
  createdBy String
  createdAt DateTime          @default(now())
}

// ---------- Notification（Derived）----------
model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String
  payload   Json
  readAt    DateTime?
  createdAt DateTime  @default(now())
}

// ---------- Audit Log（SoT, append-only，修正 C）----------
model AuditLog {
  id           String      @id @default(cuid())
  actorUserId  String?     // 誰（system 操作為 null）
  actorRole    String?     // 當下角色
  action       String      // 什麼 Action，如 "leave.approve"、"student.update"
  resourceType String      // 對哪個資源，如 "Student"、"Leave"、"Message"
  resourceId   String?
  result       AuditResult // 結果
  scopeType    String?     // SCHOOL / CLASS
  scopeId      String?
  metadata     Json?       // 變更摘要 / IP 等；不存敏感明文（健康、訊息內容）
  createdAt    DateTime    @default(now()) // 何時
  @@index([resourceType, resourceId])
  @@index([actorUserId])
  @@index([createdAt])
}

// ---------- Transactional Outbox（事件可靠交付，§4）----------
model OutboxEvent {
  id           String    @id @default(cuid())
  eventType    String
  payload      Json
  status       String    @default("PENDING") // PENDING / DISPATCHED / FAILED
  createdAt    DateTime  @default(now())
  dispatchedAt DateTime?
}

// ---------- Enums ----------
enum StudentStatus    { ACTIVE INACTIVE GRADUATED }
enum Role             { OWNER ADMIN TEACHER BUS_TEACHER PARENT GUARDIAN }
enum ScopeType        { SCHOOL CLASS }
enum GuardianRelation { FATHER MOTHER GRANDPARENT GUARDIAN }
enum TeacherRole      { HOMEROOM BUS }
enum LeaveStatus      { PENDING APPROVED REJECTED CANCELLED }
enum AttendanceStatus { PRESENT ABSENT LEAVE LATE }
enum AttendanceSource { MANUAL LEAVE_EVENT }
enum MessageCategory  { GENERAL HEALTH BEHAVIOR ADMIN }
enum AnnouncementScope{ SCHOOL CLASS }
enum AuditResult      { SUCCESS FAILURE DENIED }
```

## 移除的 model（修正 B）

先前的 `HealthRecord` / `BusAssignment` **空殼 model 已移除**——它們只有 `studentId`、無實際用途，違反 YAGNI。未來 Health / Bus 實作時，再以獨立 migration 建立完整 schema。擴充能力由 **Feature Flag + Event 訂閱點 + 文件化 Domain Boundary** 保留（見 [08-mvp-scope](./08-mvp-scope.md)）。

## Audit 安全與可靠性（修正 C；ADR-005）

- **append-only 強制於 DB 層（migration 0002，Phase 7 Step 6）**：以 **trigger** 擋 `AuditLog` 的 UPDATE / DELETE / TRUNCATE（`RAISE EXCEPTION`）;即使以 DB owner 連線，應用層也無法改/刪/清空稽核。`INSERT`/`SELECT` 不受影響。（原「REVOKE UPDATE/DELETE」對 owner 連線無效 → 改用 trigger;least-privilege app role 分離屬未來 hardening，見 ADR-005。）
- `metadata` **不得存放敏感明文**（健康細節、訊息全文）；只記操作類型與資源引用。
- 特別覆蓋：學生資料、家長資料、（未來）健康資料、訊息讀取/發送、權限變更、Leave 審核。
- **可靠性（ADR-005）**：狀態變更 → **transactional audit**（與業務同一交易，同校 DB，原子）；DENIED/FAILURE/敏感 READ → **out-of-band audit**（**MVP durable path**：durable BullMQ 佇列 `audit` + DLQ，Worker 寫入；Redis 掛才降級 structured log）。因 AuditLog 與業務同在該校 DB，transactional audit **不新增可用性依賴**，且不影響他校。
- **Read audit 白名單**：只記敏感操作（學生/家長 PII 詳情、未來健康、訊息內容）；一般清單/GET 不記錄，避免洪流。MVP 排除 WORM/SIEM。
