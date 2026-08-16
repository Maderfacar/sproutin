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
| GET | `/me` | 目前使用者 + 角色 | auth | – |
| GET | `/me/dashboard` | 動態 card 清單（後端過濾） | auth | – |
| GET | `/students?classId=` | 學生清單（scope 過濾；classId 只縮小不放寬） | Roles | – |
| GET | `/students/:id` | 學生詳情 | Roles+Scope | ✔(讀敏感) |
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
- **尚未綁定 LINE 的帳號本人無法登入**（`user_not_provisioned`）。綁定機制為開賣前必要項，
  demo 不做（見 `docs/project/08` Human Owner Action / LATER）。

## 5. 驗證與授權

- **輸入驗證**：每個 body 用 Zod（`packages/shared/dto`），fail-fast。
- **授權**：controller 掛 `@Roles()` + `@Scope()`；前端 role 不信任，以 JWT + DB 為準 (Rule 5/6)。
- **Audit**：標 ✔ 的端點經 `@Audit()` 寫入 AuditLog（誰/何時/資源/action/結果），含 DENIED。
- **錯誤處理**：全域 exception filter 轉信封格式，不洩漏敏感資訊。
