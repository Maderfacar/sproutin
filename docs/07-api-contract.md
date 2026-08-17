# 07 — API Contract (Revised, §11, §18)

> 型別在 `packages/shared`，前後端共用。統一回應信封 + Zod 驗證。

## 1. 回應信封

```ts
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { total: number; page: number; limit: number };
}
```

## 2. 認證

```text
POST /auth/line/login
  body: { idToken }                       // LIFF 取得的 LINE ID token
  → { accessToken, user, roles }          // 驗證 idToken → 找/建 User → 簽 JWT
所有後續請求：Authorization: Bearer <accessToken>
```

## 3. MVP 端點

| Method | Path | 說明 | Guard | Audit |
|--------|------|------|-------|:---:|
| GET | `/config/public` | **公開** runtime config（liffId/branding/apiBaseUrl/public flags）；**無機密**（ADR-001） | – | – |
| POST | `/auth/line/login` | LINE 登入換 JWT | – | ✔(login) |
| **POST** | **`/auth/line/bind`** | 綁定碼 → 接上帳號並同時登入 | – | ✔ |
| **GET/POST** | **`/binding-codes`** | 綁定碼：列出有效 / 簽發 | OWNER/ADMIN | ✔ |
| **DELETE** | **`/binding-codes/:id`** | 作廢綁定碼 | OWNER/ADMIN | ✔ |
| **DELETE** | **`/users/:id/line`** | 解除 LINE 綁定（帳號不刪除） | OWNER/ADMIN | ✔ |
| **POST** | **`/users/:id/roles`** | 增加身分（OWNER 身分限園長操作） | OWNER/ADMIN | ✔ |
| **DELETE** | **`/users/:id/roles/:role`** | 移除身分 + 附帶關聯 | OWNER/ADMIN | ✔ |
| GET | `/me` | 目前使用者 + 角色 | auth | – |
| GET | `/me/dashboard` | 動態 card 清單（後端過濾） | auth | – |
| GET | `/students?classId=` | 學生清單（scope 過濾；classId 只縮小不放寬） | Roles | – |
| GET | `/students/:id` | 學生詳情 | Roles+Scope | ✔(讀敏感) |
| **GET** | **`/students/:id/detail`** | 學生整合視圖（+ 班名 + 監護人清單） | Roles+Scope | ✔(讀敏感) |
| **POST** | **`/students`** | 新增學生（name + classId） | OWNER/ADMIN | ✔ |
| **PATCH** | **`/students/:id`** | 改姓名 / 換班 / 改在學狀態（**無刪除**，離校畢業改 status） | OWNER/ADMIN | ✔ |
| GET | `/classes` | 班級清單（含 studentCount） | Roles | – |
| **POST** | **`/classes`** | 新增班級（班名園內唯一） | OWNER/ADMIN | ✔ |
| **PATCH** | **`/classes/:id`** | 改班名 | OWNER/ADMIN | ✔ |
| **DELETE** | **`/classes/:id`** | 刪除班級（**僅限無學生且無老師編制**，否則 409） | OWNER/ADMIN | ✔ |
| **POST** | **`/leaves`** | 申請請假 → `LeaveSubmitted`；依 config 進 PENDING 或直接 APPROVED | PARENT(自己小孩)/TEACHER/ADMIN | ✔ |
| GET | `/leaves?studentId=` | 請假紀錄 | Roles+Scope | – |
| **PATCH** | **`/leaves/:id/status`** | 審核 approve/reject → `LeaveApproved`/`LeaveRejected` | TEACHER/ADMIN | ✔ |
| **PATCH** | **`/leaves/:id/cancel`** | 取消 → `LeaveCancelled` | 申請者/TEACHER/ADMIN | ✔ |
| GET | `/attendance?classId=&date=` | 出缺勤 | Roles+Scope | – |
| POST | `/attendance` | 手動標記（source=MANUAL） | TEACHER/ADMIN | ✔ |
| PATCH | `/attendance/:id` | 修改；若原為 Derived → 轉 MANUAL 並記 override（ADR-002） | TEACHER/ADMIN | ✔ |
| GET | `/messages?studentId=` | 訊息串（Student-centered，修正 D） | Roles+Scope | ✔(讀) |
| POST | `/messages` | 送訊息 → `MessageSent` | Roles+Scope | ✔ |
| PATCH | `/messages/:id/read` | 標記已讀 | Roles+Scope | ✔ |
| **GET** | **`/communication-book`** | 每日聯絡簿（`?classId=&date=` 整班／`?studentId=`＋`date=` 或 `from=&to=`） | Roles+Scope | – |
| **PUT** | **`/communication-book`** | 填寫／修改當日紀錄（每生每日 upsert，局部更新） | ADMIN/TEACHER | ✔ |
| **POST** | **`/communication-book/check-in`** | 點名即到校（同交易寫 Attendance + 到校時間） | ADMIN/TEACHER | ✔ |
| **POST** | **`/communication-book/publish`** | 一鍵送出全班 → `CommunicationBookPublished` | ADMIN/TEACHER | ✔ |
| GET | `/announcements` | 公告清單 | Roles | – |
| POST | `/announcements` | 發公告 → `AnnouncementPublished` | OWNER/ADMIN/TEACHER | ✔ |
| GET | `/notifications` | 站內通知 | auth(自己) | – |
| GET | `/audit-logs?resourceType=&resourceId=` | 稽核查詢（唯讀） | OWNER(/ADMIN 受限) | – |
| **GET** | **`/school/config`** | 園所設定（管理用完整值，可編輯欄位） | OWNER/ADMIN | – |
| **PATCH** | **`/school/config`** | 更新園所外觀 / 功能卡片 / 請假是否審核（局部更新） | OWNER/ADMIN | ✔ |

## 4. Leave 狀態轉移（修正 A）

```text
POST /leaves
  leaveRequiresApproval=false → 201 { status: "APPROVED" }   （直接生效，投影 Attendance）
  leaveRequiresApproval=true  → 201 { status: "PENDING" }    （等待審核）

PATCH /leaves/:id/status { status:"APPROVED"|"REJECTED", reviewNote? }
  PENDING → APPROVED  （投影 Attendance）
  PENDING → REJECTED

PATCH /leaves/:id/cancel
  PENDING|APPROVED → CANCELLED （若已投影 → 回滾 Attendance）
```

非法轉移（如對 REJECTED 再 approve）→ `409 { error: { code: "LEAVE_INVALID_TRANSITION" } }`。

## 4b. 公開 Runtime Config（ADR-001）

```text
GET /config/public   （無需認證，只回非機密值）
  → {
      schoolSlug, brandName, logoUrl, primaryColor, secondaryColor, bannerUrl,
      liffId, lineOaChannelId, lineOaBasicId,
      apiBaseUrl,               // 瀏覽器面（預設 same-origin）
      featureFlags,             // 僅 public 子集
      cardOrder, leaveRequiresApproval
    }
```

- 瀏覽器實際上打 same-origin 的 Next.js route handler `/api/public-config`，由 web server 於請求期讀 env 並取此值，避免 bundle 內嵌 per-school 值。
- **嚴禁**回傳 channel secret / access token / JWT secret / DB 憑證。
- **嚴禁**回傳 `API_INTERNAL_URL`（server-only）。`apiBaseUrl` 只表達瀏覽器面 origin（通常 same-origin）。

## 4c. 園所設定（管理用，Phase 9 階段2）

```text
GET /school/config      （OWNER/ADMIN）
  → { brandName, logoUrl, bannerUrl, primaryColor, secondaryColor,
      featureFlags, cardOrder, leaveRequiresApproval, theme, dashboardLayout }

PATCH /school/config    （OWNER/ADMIN;全欄位選填 = 局部更新;未知欄位一律 400）
  body 可含: brandName / logoUrl / bannerUrl / primaryColor / secondaryColor /
            featureFlags / cardOrder / leaveRequiresApproval
  → 同 GET 形狀
```

- 與 `GET /config/public` 的分工：`/config/public` 是**公開唯讀**、供未登入的前端取品牌與 LIFF 值（ADR-001）；
  `/school/config` 是**登入後的管理介面**，只含園所可自行編輯的欄位（不含 liffId 等部署決定的值）。
- 顏色限 `#RRGGBB`；圖片限 `http(s)://…` 或站內相對路徑（內建圖庫）。
- `featureFlags` 兩種語意（見 `packages/shared/dashboard.ts`）：規劃中功能為 opt-in（`true` 才顯示）；
  已上線功能預設顯示，設 `false` 即對該園所隱藏。
- 圖片上傳走 web 端 `POST /api/uploads/image`（same-origin → Vercel Blob），回傳網址後再由本端點寫入；
  API 本身不接收檔案。

## 4d. 班級 / 學生管理（Phase 9 階段2 刀2）

```text
POST   /classes        { name }                    → ClassView（班名重複 → 409 class_name_taken）
PATCH  /classes/:id    { name }                    → ClassView
DELETE /classes/:id                                → 204;班內有學生 → 409 class_has_students
                                                     班內有老師編制 → 409 class_has_teachers
POST   /students       { name, classId }           → StudentView（班級不存在 → 400 class_not_found）
PATCH  /students/:id   { name?, classId?, status? } → StudentView（未知欄位 400;無變更 400 no_changes）
```

- **只停用不刪除**（Human Owner 決策 2026-08-17）：學生無 DELETE，離校/畢業改 `status`（ACTIVE/INACTIVE/GRADUATED），
  出缺勤・請假・訊息等歷史紀錄才不會成為孤兒；班級只在「無學生且無老師編制」時才可刪。
- 稽核：`class.create` / `class.rename` / `class.delete` / `student.create` / `student.update`，
  與業務變更同一 transaction（ADR-005 類別一）。**metadata 不存學生姓名等 PII**（修正 C），
  換班額外記 `fromClassId` / `toClassId` 供追溯。

## 4e. 人員帳號與關聯（Phase 9 階段2 刀3）

```text
GET    /users?role=                              → UserView[]（含角色、綁定小孩、任教班級、是否已綁 LINE）
POST   /users            { displayName, role }   → UserView（建立帳號 + 一個角色）
PATCH  /users/:id        { displayName?, status? } → UserView（**無 DELETE**）
POST   /users/:id/roles  { role }                → UserView（增加身分；階段3 ②b）
DELETE /users/:id/roles/:role                    → UserView（移除身分 + 附帶關聯）

POST   /guardianships    { userId, studentId, relation, isPrimary? } → { id }
DELETE /guardianships/:id                        → 204
POST   /teacher-assignments { userId, classId }  → { id }
DELETE /teacher-assignments/:id                  → 204
```

全部 `OWNER/ADMIN`，全部寫稽核（`user.create` / `user.update` / `guardianship.add|remove` / `teacher_assignment.add|remove`）。

- **只停用不刪除**：`status=INACTIVE` 即無法登入（`login` 與 `/me` 兩處擋，既有 JWT 於下次載入失效）。
  **最後一位在職 OWNER 不得停用** → 400 `last_owner_cannot_be_disabled`（否則園所無人可管理）。
- **UserRole 一律建 SCHOOL scope**：班級層級授權的真正依據是 `TeacherAssignment`（見 `ScopeResolver`），
  避免班級歸屬存在兩處而不同步。
- 重複綁定 → 409 `guardianship_exists` / `assignment_exists`；對象不存在 → 400。
- **尚未綁定 LINE 的帳號本人無法登入**（`user_not_provisioned`）。綁定機制見 §4g。

### 身分（角色）增刪（階段3 ②b）

原本角色只能在建立帳號時給一次，之後無法變更或增補。實務上必然發生：建錯要能改、
**老師自己的小孩也在園裡（同時是老師與家長）是幼兒園常態**、升任行政、園長交接。
資料模型（`UserRole` 多筆 + `@@unique([userId, role, scopeType, scopeId])`）本就支援，缺的只是寫入端點。

```text
POST   /users/:id/roles        { role }   → UserView   （OWNER/ADMIN）
DELETE /users/:id/roles/:role             → UserView   （OWNER/ADMIN）
稽核：user.role_grant / user.role_revoke（metadata 只記角色與解除數量，不記姓名/班名）
```

- **園長身分只有園長能給或拿掉** → 403 `owner_role_requires_owner`。
  否則行政可自行升級為園長，權限矩陣形同虛設。
- **最後一位園長的園長身分不可移除** → 400（沿用 `assertNotLastActiveOwner`）。
- **每人至少保留一個身分** → 400 `last_role_cannot_be_removed`。
  零身分的帳號登得進來卻什麼都看不到 —— 那是離職，應該用「停用帳號」。
- **移除身分時一併解除該身分附帶的關聯**：拔掉 TEACHER/BUS_TEACHER（且不再保有任一教職身分）
  → 刪除其 `TeacherAssignment`；拔掉 PARENT/GUARDIAN（且不再保有任一家長身分）
  → 刪除其 `Guardianship`。理由：**幽靈權限比沒有權限更危險** —— 不再是老師卻還掛在班上，
  ScopeResolver 仍會放行。前端在按下之前明講「會同時取消他帶的 N 個班」。
- 移除以 `deleteMany({ userId, role })` 不限 scope —— seed 建立的 TEACHER 帶 CLASS scope，
  後台建立的帶 SCHOOL scope，兩種都要清得掉。

## 4f. 每日聯絡簿（Phase 9 階段2 刀4）

```text
GET  /communication-book?classId=&date=            → BookEntryView[]（校方整班；date 必填）
GET  /communication-book?studentId=&date=          → BookEntryView[]（單日）
GET  /communication-book?studentId=&from=&to=      → BookEntryView[]（回溯區間）

PUT  /communication-book
     { studentId, date, arrivalTime?, lunch?, snack?, nap?, toilet?, mood?,
       symptoms?, temperature?, pickup?, teacherNote? }        → BookEntryView

POST /communication-book/check-in
     { studentId, date, arrivalTime, status: PRESENT|LATE }    → BookEntryView

POST /communication-book/publish
     { classId, date, pushStudentIds: string[] }               → { published, pushed }
```

- **每生每日一筆**（`@@unique([studentId, date])`）；`date` 正規化為當日 UTC 午夜（同 Attendance）。
- **所有欄位皆可留空**：未提供的欄位不動（局部更新），明確傳 `null` 才清空。強迫必填只會逼出假資料。
- **家長只讀已送出的紀錄**（`publishedAt` 非 null）；校方看得到填寫中的內容。
- **老師只能填寫/修改近 7 天**：超出 → 400 `book_edit_window_expired`；未來日期 → 400 `book_future_date`。
- **點名即到校**：`check-in` 在**同一 transaction** 內呼叫 `AttendanceService.markWithin`（沿用 ADR-002 的
  override 規則與 `AttendanceMarked` Outbox）再寫 `arrivalTime` —— 老師一個動作完成兩件事，
  不會出現「出缺勤寫了、聯絡簿沒寫」的半套狀態。
- **送出**只處理「已有內容且尚未送出」的紀錄（不會憑空產生空白聯絡簿）；`pushStudentIds` 會被
  後端限縮在本次實際送出的學生內（不信任前端）。全班皆未填 → 不發事件。
- 稽核：`communication_book.save` / `.check_in` / `.publish`，與業務變更同一 transaction。
  **metadata 只記欄位名與 studentId，不記留言內容、症狀與姓名**（修正 C）。
- 入口：「訊息」卡片已併入「聯絡簿」（見 docs/05）；`/messages` 端點與權限不變。

## 4g. LINE 帳號綁定（Phase 9 階段3）

```text
POST   /auth/line/bind    { idToken, code }      → { accessToken, user }（未認證即可呼叫）

GET    /binding-codes?userId=                    → BindingCodeView[]（OWNER/ADMIN；只回有效的碼）
POST   /binding-codes     { userId, ttlDays? }   → BindingCodeView（OWNER/ADMIN）
DELETE /binding-codes/:id                        → 204（作廢，保留紀錄）
DELETE /users/:id/line                           → 204（解除綁定，帳號不刪除）
```

**為什麼需要**：園所後台建立的帳號（「張媽媽」）與 LINE 登入取得的匿名 `userId`（`U1a2b3c…`）之間
沒有任何可自動對應的線索 —— LINE 暱稱不可信，也不保證與真名有關。綁定碼是園所簽發、由本人輸入
一次的憑證，把兩者接起來。綁的是**人**不是小孩，因此一次綁定，其所有小孩與角色一起生效。

- **碼格式**：8 碼、顯示為 `XXXX-XXXX`。字母表排除 `0/O/1/I/L` 等易混淆字元（32 字母表 → 約
  1.1×10^12 組合）。**刻意不用 6 位數字**：6 位數只有 100 萬組，在尚未上線 rate limiting 的情況下
  可被暴力嘗試。輸入時容忍大小寫、空白與連字號，但**不自動竄改看似看錯的字元**（沒有安全的猜法）。
- **失效規則**：有期限（預設 30 天）、用過即失效、可主動作廢；重新簽發時同一帳號既有未使用的碼
  一併作廢（條子不見了就重發，舊碼不留著被撿去用）。
- **錯誤不區分原因**：查無 / 已用 / 已作廢 / 已過期一律回 `binding_code_invalid`，否則等於提供一個
  可探測有效碼的介面。前端訊息一併列出可能原因，讓使用者知道下一步找誰。
- **一個 LINE 一個人**：`LineIdentity.lineUserId` 已 `@unique`；兌換前另檢查該 LINE 是否已綁他人
  （`line_already_bound`）。兌換以條件式 `updateMany` 樂觀鎖，同碼並行只有一個成功。
- **綁定即登入**：`/auth/line/bind` 一次完成「驗證 idToken + 兌換碼 + 簽發 JWT」。拆成兩步會需要一個
  「已驗證 LINE 但尚無身分」的臨時 token，那是沒有必要的攻擊面。
- **解綁**是換手機 / 綁錯人 / 家長換 LINE 帳號的救援出口；解綁後帳號回到未綁定，可重新發碼。
- 稽核：`binding_code.issue` / `.revoke` / `.redeem` / `user.line_unbind`。
  **稽核不存碼本身（等同憑證明文），也不存 `lineUserId`（識別性資料）**（修正 C）。

## 4h. 桌面後台的登入（Phase 9 階段3；**後端無新端點**）

桌面版 `/admin/*` 用 **LINE Login 網頁版 OAuth** 取得身分，**不新增任何後端端點**：

```text
GET  /api/admin/oauth/start   （web）產生 state → httpOnly cookie → 導向 LINE 授權頁
GET  /admin/callback          （web）驗 state → code 換 id_token（需 channel secret）
                               → 呼叫既有 POST /auth/line/login → 設 sp_session cookie
                               → 認不出來（user_not_provisioned）則導向 /admin/bind
POST /api/auth/line/bind      （web）body 未帶 idToken 時改讀 httpOnly cookie，
                               再呼叫既有 POST /auth/line/bind
```

**LIFF 與網頁版 OAuth 屬同一個 LINE Login channel**，兩者的 id_token `aud` 都等於
`LINE_LOGIN_CHANNEL_ID`，因此 `LineVerifier`、`AuthService`、RBAC 全部沿用，**認出的是同一個
`LineIdentity` → 同一個 `User`**。桌面後台不是第二套身分系統。

- 新環境變數（web 伺服器端）：`LINE_LOGIN_CHANNEL_ID`、`LINE_LOGIN_CHANNEL_SECRET`；
  選用 `WEB_PUBLIC_URL`（未設定時由 `x-forwarded-host` 推導 redirect_uri）。
- `redirect_uri` 必須與 LINE 後台登記的 Callback URL 完全一致，不一致由 LINE 直接拒絕。
- LINE 憑證（id_token）**全程不進前端**：只存在伺服器端與 httpOnly cookie。

## 4i. 園所 LINE 圖文選單（Phase 9 階段3 ④）

```text
GET    /rich-menus                    → RichMenuConfigView[]（三份：PARENT/STAFF/UNBOUND）
PUT    /rich-menus/:audience          → RichMenuConfigView（**儲存設計，不碰 LINE**）
POST   /rich-menus/:audience/apply    → { audience, linkedUsers, appliedAt }（真的送到 LINE）
稽核：rich_menu.save / rich_menu.apply（metadata 只記對象、版面、格數與人數）
```

全部 `OWNER/ADMIN`（園所外觀屬園務管理）。模板式：園所換底圖 + 選每格連到哪 + 填字，
不做自由拉區域 —— 設計骨架鎖住＝填空題不是作文。

**LINE 的實際限制**（2026-08-17 查證自 Messaging API reference，非憑印象）：

| 項目 | 值 |
|---|---|
| 底圖格式 / 大小 | JPEG 或 PNG、**≤1MB** |
| 底圖尺寸 | 寬 800–2500px、高 ≥250px、寬/高 **≥1.45** |
| 一份選單最多格數 | **20**（我們最多用 6） |
| name / chatBarText | 300 字 / **14 字** |
| 一個官方帳號最多選單數 | **1000** |
| 建立選單頻率 | **100 次/小時** |
| 批次綁定 | 一次 **500** 人、2000 次/秒、非同步（202 不等於全部成功） |

**為什麼儲存與套用要分開**：LINE 不允許覆蓋既有選單的底圖（換圖＝建新選單），而
「建立選單」有每小時 100 次上限。園長調版面時會存很多次，若每次儲存都建選單很快就撞上限。
因此 `PUT` 只寫本地資料庫，`apply` 才動 LINE。

**套用的順序**（順序有意義，寫反會出事）：
```text
建新選單 → 上傳底圖 → 綁人（或設為預設）→ **最後**才刪舊的
先刪舊的話，中途任一步失敗會讓全園所暫時沒有選單可用。
刪除失敗不使整個套用失敗（新選單已生效），只記錄 —— 但額度會累積，需留意 1000 份上限。
```

- **UNBOUND 設為「預設選單」**而非逐一綁定 —— 還沒綁定的人我們根本不知道是誰。
  個別綁定的優先權高於預設，所以已綁定者不受影響（LINE 官方定義的優先序）。
- **綁定成功當下自動換選單**：`BindingCodeService.redeem()` 成功後呼叫 `RichMenuLinkService`，
  依其角色換上家長版或老師版。**這一步失敗絕不可讓綁定失敗**（錯誤只記錄不丟出），
  沒換到的話園所下次套用會補上。
- 每格連到帶路徑的 LIFF URL：`https://liff.line.me/{liffId}/{path}`
  （LIFF SDK 以 `liff.state` 轉址到 Endpoint URL + 該路徑）。
- **前提**：每園需有自己的 OA 與 channel token。目前共用 demo OA（Human Owner 確認為內部測試用）。

## 5. 驗證與授權

- **輸入驗證**：每個 body 用 Zod（`packages/shared/dto`），fail-fast。
- **授權**：controller 掛 `@Roles()` + `@Scope()`；前端 role 不信任，以 JWT + DB 為準 (Rule 5/6)。
- **Audit**：標 ✔ 的端點經 `@Audit()` 寫入 AuditLog（誰/何時/資源/action/結果），含 DENIED。
- **錯誤處理**：全域 exception filter 轉信封格式，不洩漏敏感資訊。
