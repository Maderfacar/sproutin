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
| GET | `/students?classId=` | 學生清單（scope 過濾） | Roles+Scope | – |
| GET | `/students/:id` | 學生詳情 | Roles+Scope | ✔(讀敏感) |
| POST/PATCH | `/students...` | 建立/修改學生 | ADMIN+ | ✔ |
| GET | `/classes` | 班級清單 | Roles | – |
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

## 5. 驗證與授權

- **輸入驗證**：每個 body 用 Zod（`packages/shared/dto`），fail-fast。
- **授權**：controller 掛 `@Roles()` + `@Scope()`；前端 role 不信任，以 JWT + DB 為準 (Rule 5/6)。
- **Audit**：標 ✔ 的端點經 `@Audit()` 寫入 AuditLog（誰/何時/資源/action/結果），含 DENIED。
- **錯誤處理**：全域 exception filter 轉信封格式，不洩漏敏感資訊。
