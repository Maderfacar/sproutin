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
| CommunicationBookEntry | **SoT** | 老師記錄的當日觀察（每生每日一筆）。出缺勤/請假/親師對話**不複製**進本表 |
| BindingCode | **SoT** | 園所簽發的一次性憑證，把「園所帳號」接上「本人的 LINE」（見 docs/07 §4g） |
| RichMenuConfig | **SoT** | 園所的 LINE 圖文選單設計（一個對象一份）;已套用的 LINE 選單 ID 另存（見 docs/07 §4i） |
| PushCampaign | **SoT** | 一次 LINE 群發的內容、對象與結果。**因為送出後無法收回，必須留帳**（見 docs/07 §4j） |
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

// ---------- 每日聯絡簿（SoT；Phase 9 階段2 刀4）----------
// 每個學生、每一天一筆。「一個孩子的頁面」＝ 本表的當日狀態 + Message 的親師對話。
// 邊界（刻意不放進本表）：
//   - 出缺勤 / 請假 → Attendance / Leave 各自為 SoT；本表只借 arrivalTime 記到校時刻。
//   - 親師對話 → Message（Student-centered）；本表只存老師的當日留言。
//   - 過敏原 / 用藥委託 / 成長曲線 → 未來「幼兒健康」模組的長期資料（修正 B，不預建）。
// 沒有列 = 當日未記錄；publishedAt = null 代表老師尚未送出（家長看不到）。
model CommunicationBookEntry {
  id          String          @id @default(cuid())
  studentId   String
  student     Student         @relation(fields: [studentId], references: [id])
  date        DateTime        // 當日零點（UTC），與 Attendance 同慣例
  arrivalTime String?         // "HH:mm"；由點名（check-in）帶入
  lunch       MealAmount?
  snack       MealAmount?
  nap         NapQuality?
  toilet      ToiletState?
  mood        Mood?
  symptoms    HealthSymptom[] // 可複選；空陣列 = 無異狀
  temperature Float?          // 攝氏，選填；只有實際量過才有值
  pickup      PickupMethod?
  teacherNote String?
  filledBy    String?
  filledAt    DateTime?
  publishedAt DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  @@unique([studentId, date])
  @@index([date])
}

// ---------- LINE 綁定碼（SoT；Phase 9 階段3；規則見 docs/07 §4g）----------
model BindingCode {
  id               String    @id @default(cuid())
  code             String    @unique  // 8 碼，顯示為 XXXX-XXXX；字母表排除易混淆字元
  userId           String
  user             User      @relation(fields: [userId], references: [id])
  expiresAt        DateTime
  usedAt           DateTime?           // 用過即失效
  usedByLineUserId String?             // 稽核用：實際是哪個 LINE 帳號用掉的
  revokedAt        DateTime?           // 園所主動作廢（保留紀錄，不刪除）
  createdBy        String
  createdAt        DateTime  @default(now())
  @@index([userId])
}

// ---------- LINE 圖文選單設計（SoT；Phase 9 階段3；規則見 docs/07 §4i）----------
// 設計（本表）與「已套用到 LINE 的那一份」（lineRichMenuId）刻意分開：
// LINE 不允許覆蓋既有選單的底圖 —— 換圖必須建新選單、綁人、再刪舊的。
// 加上「建立選單」有每小時 100 次上限，因此**儲存設計不碰 LINE，只有「套用」才碰**。
model RichMenuConfig {
  id             String           @id @default(cuid())
  audience       RichMenuAudience @unique  // 一個對象一份設計
  template       RichMenuTemplate @default(SIX)
  imageUrl       String?                   // 底圖（Vercel Blob）
  chatBarText    String           @default("開啟選單")  // LINE 限 14 字
  items          Json             @default("[]")        // [{ index, target }]
  lineRichMenuId String?                   // 已套用的那一份（下次套用時解除並刪除）
  appliedAt      DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
}

// ---------- LINE 群發（SoT；Phase 9 階段3；規則見 docs/07 §4j）----------
// **這張表存在的理由是「送出後無法收回」**：LINE 沒有撤回已送出推播的方法，因此每一次群發都要
// 留下「誰、何時、把什麼內容、發給了多少人」的帳。內容是版型填空（title/body/fields）而非
// 自由 JSON —— 園所不寫 Flex JSON，設計骨架鎖在程式裡（同圖文選單的策略）。
// status 用自由字串（同 OutboxEvent）：日後增加狀態不需要 migration。
model PushCampaign {
  id             String               @id @default(cuid())
  template       PushCampaignTemplate                    // EVENT / PAYMENT / GENERAL
  audience       PushCampaignAudience                     // ALL_PARENTS / CLASS / STAFF
  classId        String?                                  // audience=CLASS 時的班級
  title          String
  body           String
  imageUrl       String?                                  // 選填（Vercel Blob；LINE 要求 https）
  buttonLabel    String?
  buttonUrl      String?                                  // App 內頁的 LIFF 連結，或園所自填的外部 https 網址
  fields         Json                 @default("{}")      // 版型專屬的**顯示用文字**（日期地點 / 金額期限）
  status         String               @default("QUEUED")  // QUEUED → SENDING → SENT / FAILED
  failureReason  String?                                  // 給園長看得懂的一句話
  recipientCount Int                  @default(0)         // 建立當下的預估（給園長看的「會送出 N 則」）
  sentCount      Int                  @default(0)         // worker 實際送出
  skippedCount   Int                  @default(0)         // LINE 不認得而略過
  createdBy      String
  createdAt      DateTime             @default(now())
  sentAt         DateTime?

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

// 每日聯絡簿的選項（刀4）。順序即 UI 由「最順利」到「最需注意」；
// 直欄模式的「全班預設」取每個清單的第一項（例外導向：預設正常，只點不一樣的）。
enum MealAmount       { ALL MOST HALF LITTLE NONE }
enum NapQuality       { WELL SHORT NONE }
enum ToiletState      { NORMAL LOOSE HARD NONE }
enum Mood             { HAPPY CALM SLEEPY LOW }
enum HealthSymptom    { COUGH RUNNY_NOSE SORE_THROAT DIARRHEA VOMITING POOR_APPETITE LOW_ENERGY RASH }
enum PickupMethod     { FAMILY SCHOOL_BUS }
```

## 移除的 model（修正 B）

先前的 `HealthRecord` / `BusAssignment` **空殼 model 已移除**——它們只有 `studentId`、無實際用途，違反 YAGNI。未來 Health / Bus 實作時，再以獨立 migration 建立完整 schema。擴充能力由 **Feature Flag + Event 訂閱點 + 文件化 Domain Boundary** 保留（見 [08-mvp-scope](./08-mvp-scope.md)）。

## Audit 安全與可靠性（修正 C；ADR-005）

- **append-only 強制於 DB 層（migration 0002，Phase 7 Step 6）**：以 **trigger** 擋 `AuditLog` 的 UPDATE / DELETE / TRUNCATE（`RAISE EXCEPTION`）;即使以 DB owner 連線，應用層也無法改/刪/清空稽核。`INSERT`/`SELECT` 不受影響。（原「REVOKE UPDATE/DELETE」對 owner 連線無效 → 改用 trigger;least-privilege app role 分離屬未來 hardening，見 ADR-005。）
- `metadata` **不得存放敏感明文**（健康細節、訊息全文）；只記操作類型與資源引用。
- 特別覆蓋：學生資料、家長資料、（未來）健康資料、訊息讀取/發送、權限變更、Leave 審核。
- **可靠性（ADR-005）**：狀態變更 → **transactional audit**（與業務同一交易，同校 DB，原子）；DENIED/FAILURE/敏感 READ → **out-of-band audit**（**MVP durable path**：durable BullMQ 佇列 `audit` + DLQ，Worker 寫入；Redis 掛才降級 structured log）。因 AuditLog 與業務同在該校 DB，transactional audit **不新增可用性依賴**，且不影響他校。
- **Read audit 白名單**：只記敏感操作（學生/家長 PII 詳情、未來健康、訊息內容）；一般清單/GET 不記錄，避免洪流。MVP 排除 WORM/SIEM。
