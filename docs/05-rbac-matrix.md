# 05 — RBAC Permission Matrix (Revised, §17–18)

> `(Role) × (Resource) × (Action)`，全部在**後端 Guard** 驗證 (Rule 5/6)。
> 前端只用角色決定顯示，**不做授權決策**。
> **所有重要權限與資料操作皆寫入 AuditLog**（修正 C）。

## 1. 角色 (§18)

| Role | 中文 | 限縮 |
|------|------|------|
| `OWNER` | 園長 | 全校 |
| `ADMIN` | 行政 | 全校 |
| `TEACHER` | 班導師 | scope=CLASS（自班） |
| `BUS_TEACHER` | 隨車老師 | 乘車名單 |
| `PARENT` | 家長 | Guardianship（自己小孩） |
| `GUARDIAN` | 監護人 | 同 PARENT |

## 2. 權限矩陣（MVP）

| Resource / Action | OWNER | ADMIN | TEACHER | BUS_TEACHER | PARENT/GUARDIAN |
|---|:---:|:---:|:---:|:---:|:---:|
| School config / branding | CRUD | **CRUD** | – | – | – |
| Feature flag / leaveRequiresApproval | CRUD | **CRUD** | – | – | – |
| Class | CRUD | CRUD | R(自班) | R(自車) | – |
| Student | CRUD | CRUD | R(自班) | R(乘車名單) | R(自己小孩) |
| Attendance | R | CRUD | CRUD(自班) | R | R(自己小孩) |
| Leave – 申請 | – | Create | Create(自班) | – | **Create(自己小孩)** |
| Leave – 審核(approve/reject) | R | ✔ | ✔(自班) | – | – |
| Leave – 取消 | ✔ | ✔ | ✔(自班) | – | ✔(自己申請) |
| Message | R | R | Send/R(自班) | – | Send/R(對自己小孩) |
| **CommunicationBook** | R | **CRUD** | **CRUD(自班)** | – | **R(自己小孩，限已送出)** |
| Announcement | CRUD | CRUD | Create(班級) | – | R |
| Notification | R(自己) | R(自己) | R(自己) | R(自己) | R(自己) |
| **AuditLog** | **R** | R(受限) | – | – | – |
| **BindingCode**（發碼/作廢/解綁） | **CRUD** | **CRUD** | – | – | – |
| **UserRole**（增減身分） | **CRUD** | **CRUD**（不含 OWNER 身分） | – | – | – |
| **RichMenuConfig**（圖文選單設計 / 套用） | **CRUD** | **CRUD** | – | – | – |
| **PushCampaign**（LINE 群發） | **CR** | **CR** | – | – | – |
| **BusRoute / BusPoint / BusAssignment**（娃娃車設定） | **CRUD** | **CRUD** | – | **R(自車)** | – |
| **BusRide**（上下車點名） | **CRUD** | **CRUD** | – | **CRUD(自車)** | **R(自己小孩)** |

> 修正 A：Leave 的「審核」權限僅在 `leaveRequiresApproval=true` 時有意義；為 false 時申請即自動 APPROVED，無審核步驟。
>
> **變更（2026-08-17, Human Owner 決定）**：`School config / branding` 與 `Feature flag / leaveRequiresApproval` 的 `ADMIN` 由 `R` 放寬為 `CRUD`。理由：園所實務上由行政人員維護園所外觀與功能開關，園長不見得親自操作。落地於 `GET/PATCH /school/config` 的 `@Roles('OWNER','ADMIN')`。
>
> **新增（2026-08-17, 階段2 刀4）**：`CommunicationBook`（每日聯絡簿）比照 `Attendance` —— 老師填自班、行政全校、園長唯讀、家長只讀自己小孩。兩點差異：
> ① **家長只看得到已送出的紀錄**（`publishedAt` 非 null），否則會看到老師填到一半的半成品；
> ② **老師只能填寫/修改近 7 天**（`book_edit_window_expired`），避免事後改寫已交付家長的紀錄；家長端可回溯查閱全部歷史。
>
> **新增（2026-08-17, 階段3 ②b）**：`UserRole` 增減限 `OWNER/ADMIN`，但**「園長」這個身分的授予與移除只有 `OWNER` 能做**（`owner_role_requires_owner`）——否則行政可以自行升級為園長，整張矩陣形同虛設。另兩道防呆：最後一位園長的園長身分不可移除（園所會沒有人能管理）；每人至少保留一個身分（零身分的帳號登得進來卻什麼都看不到，那是離職，應該用停用帳號）。**移除身分會一併解除該身分附帶的關聯**（TeacherAssignment / Guardianship），因為 `ScopeResolver` 是依那些關聯放行的——留著就是幽靈權限。詳見 docs/07 §4e。
>
> **新增（2026-08-17, 階段3）**：`BindingCode` 限 `OWNER/ADMIN` —— 發碼等同「把人放進系統」的開門權，不下放給老師。兌換端 `POST /auth/line/bind` 無需認證（本來就還沒有身分），安全性由碼本身的熵、期限與一次性保證。
>
> **新增（2026-08-17, 階段3）**：`PushCampaign`（LINE 群發）限 `OWNER/ADMIN` —— **老師不得群發**（Human Owner 拍板）。理由不是層級而是後果：群發會產生 LINE 推播費用，且**送出後無法收回**（LINE 未提供撤回已送出推播的方法）。只有建立與查詢（`CR`），**沒有修改與刪除**：已經送到家長手機上的訊息，改掉紀錄只會讓帳不實。詳見 docs/07 §4j。
>
> **新增（2026-08-18, ⑦ 娃娃車刀1）**：設定類（路線 / 接送點 / 固定名單）限 `OWNER/ADMIN`；點名（`BusRide`）加開 `BUS_TEACHER`。
> **`BUS_TEACHER` 的 scope 落地為「`BusRoute.busTeacherId` 指到他的那條路線」** —— 娃娃車跨班，既有的
> 「老師 ↔ 班級」（`TeacherAssignment`）對應解不了「他負責哪一車」，故由路線指名隨車老師（Human Owner 選項 A）。
> 沒有這一層的話，兩台車同時在跑時老師點錯車不會有任何阻擋。家長端**只有讀**（`GET /me/bus`）：
> **家長不能自己改接送點**（會讓路線亂掉，Human Owner 定案），換點要找園所；「明天不搭車」屬刀2。
> door-to-door 之故，資源名稱是「接送點」（`BusPoint`）而非站牌。詳見 docs/07 §4k。
>
> 入口變更：**「訊息」卡片已併入「聯絡簿」**（Human Owner 決策 A）。Message 的權限與 API 不變，只是不再是獨立入口；聯絡簿卡片因此納入 `ADMIN`，行政人員才不會失去訊息的閱讀入口。

## 3. Scope 限縮（資料列級）

| Role | 限縮依據 | Guard 檢查 |
|------|----------|-----------|
| TEACHER | `UserRole.scopeId = classId` | 目標資源的 class 是否 = 老師的班 |
| BUS_TEACHER | 乘車名單 | 目標路線的 `busTeacherId` 是否為本人；學生是否在該路線的 `BusAssignment` 上 |
| PARENT/GUARDIAN | `Guardianship` | 目標學生是否為其監護對象 |

## 4. Guard + Audit 實作原則

```ts
@Roles(Role.TEACHER, Role.ADMIN)   // 粗粒度
@Scope('class')                    // 細粒度（資料列級）
@Audit('leave.approve', 'Leave')   // 修正 C：記錄誰/何時/資源/action/結果
@Patch('leaves/:id/status')
approve(...) { ... }
```

- `RolesGuard` → 角色；`ScopeGuard` → 「這筆資料是不是你的」。
- **兩層都要過**；前端傳的 role 不信任，以 JWT + DB 為準 (Rule 6)。
- **DENIED 保證記錄（ADR-005）**：授權拒絕發生在 guard、無業務交易，改走 **out-of-band audit**（**MVP durable path**：durable BullMQ 佇列 `audit` + DLQ → Worker 寫入；Redis 掛才降級 structured log）。拒絕回應照常返回，audit 至少一次、非阻塞。
- 狀態變更成功/失敗走 **transactional audit**（與業務同一交易）。
- **Read audit 限敏感操作白名單**（如 `GET /students/:id` PII、`GET /messages` 內容）；一般清單/GET 不記錄。

## 5. 一人多角色

一個 User 可有多筆 `UserRole`；Guard 對每個資源取**最高適用權限**判斷。
