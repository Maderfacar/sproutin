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
| School config / branding | CRUD | R | – | – | – |
| Feature flag / leaveRequiresApproval | CRUD | R | – | – | – |
| Class | CRUD | CRUD | R(自班) | R(自車) | – |
| Student | CRUD | CRUD | R(自班) | R(乘車名單) | R(自己小孩) |
| Attendance | R | CRUD | CRUD(自班) | R | R(自己小孩) |
| Leave – 申請 | – | Create | Create(自班) | – | **Create(自己小孩)** |
| Leave – 審核(approve/reject) | R | ✔ | ✔(自班) | – | – |
| Leave – 取消 | ✔ | ✔ | ✔(自班) | – | ✔(自己申請) |
| Message | R | R | Send/R(自班) | – | Send/R(對自己小孩) |
| Announcement | CRUD | CRUD | Create(班級) | – | R |
| Notification | R(自己) | R(自己) | R(自己) | R(自己) | R(自己) |
| **AuditLog** | **R** | R(受限) | – | – | – |

> 修正 A：Leave 的「審核」權限僅在 `leaveRequiresApproval=true` 時有意義；為 false 時申請即自動 APPROVED，無審核步驟。

## 3. Scope 限縮（資料列級）

| Role | 限縮依據 | Guard 檢查 |
|------|----------|-----------|
| TEACHER | `UserRole.scopeId = classId` | 目標資源的 class 是否 = 老師的班 |
| BUS_TEACHER | 乘車名單 | 目標學生是否在其負責車次 |
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
