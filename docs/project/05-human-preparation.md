# 05 — Human Owner Preparation

> **嚴禁把真正 secret 寫入 repository。** 本文件只列「需要哪些變數 / 帳號 / 資料」，不含任何真值。

## 1. Accounts（需申請 / 準備）

| 帳號 | 用途 | 何時需要 |
|------|------|----------|
| **GitHub** | repo、CI（Actions） | 現在（Phase 5 驗收） |
| **Vercel** | Web（+可能 API）部署、Preview | 現在（Phase 5 驗收） |
| **LINE Developers** | LINE Login channel、LIFF app | Phase 6（登入切片） |
| **LINE Official Account** | OA、push、entry point | Phase 6–7 |
| **PostgreSQL provider（Managed）** | 每校獨立 DB | Phase 6（首次 migration） |
| **Redis provider** | cache / BullMQ | Phase 6–7（Worker） |

> Worker 的 production hosting 尚待 Architecture Review（見 [07](./07-current-status.md)）——選 Redis/Worker provider 前先看該決議。

## 2. Environment / Secrets（只列變數名，不寫真值）

| 變數 | Purpose | Server-only / Client-visible | 存放位置 | 現在/稍後 |
|------|---------|------------------------------|----------|-----------|
| `DATABASE_URL` | 該校 PostgreSQL 連線 | **Server-only（secret）** | Secret Manager（Control Plane 存 `databaseSecretRef`） | Phase 6 |
| `REDIS_URL` | Redis / BullMQ | **Server-only** | Secret Manager / 平台 env | Phase 6 |
| `LINE_CHANNEL_ID` | LINE channel 識別 | Server-only（非高敏） | 平台 env | Phase 6 |
| `LINE_CHANNEL_SECRET` | LINE 驗證 | **Server-only（secret）** | Secret Manager（`lineSecretRef`） | Phase 6 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE push | **Server-only（secret）** | Secret Manager（`lineSecretRef`） | Phase 7 |
| `LIFF_ID` | LIFF app id（**公開**） | Client-visible（runtime，非 build-time） | 該校 DB `SchoolConfig` → `/config/public` | Phase 6 |
| `JWT_SECRET` | JWT 簽章 | **Server-only（secret）** | Secret Manager（`jwtSecretRef`） | Phase 6 |
| `SCHOOL_SLUG` | 本 instance 識別 | Server-only | 平台 env | Phase 5–6 |
| `API_INTERNAL_URL` | web server → api 內部連線 | **Server-only（不得進 bundle / public config）** | 平台 env | Phase 5–6 |

> 原則（ADR-001 / ADR-004）：public 值（如 `LIFF_ID`、branding）走 runtime `/config/public`；機密走 Secret Manager，Control Plane 只存 reference。

## 3. Demo Data（未來準備，優先 synthetic）

> **MVP / development / online verification 優先使用 synthetic / demo data，不使用不必要的真實兒童資料。**

- [ ] Demo School（1 間）
- [ ] Demo Class（≥2 班，測 class isolation）
- [ ] Demo Admin（行政）
- [ ] Demo Teacher（班導 + 隨車）
- [ ] Demo Parent（含一位家長對多小孩）
- [ ] Demo Student（多名，跨班）
- [ ] **Multiple Guardianship scenario**（一生多監護人：父/母/祖父母）
- [ ] **Multiple Class scenario**（老師跨班 / 學生分班）
- [ ] **Permission test scenario**（家長只見自己小孩、老師只見自班）
- [ ] **Leave / Attendance test scenario**（含 override 衝突情境，ADR-002）

## 4. Online Testing Accounts / Devices

- [ ] Parent test account（真實 LINE）
- [ ] Teacher test account（真實 LINE）
- [ ] Admin test account
- [ ] LINE test accounts（≥2，測隔離）
- [ ] Mobile device（LIFF WebView 實測）
- [ ] Desktop browser（一般 Web）

## 5. 目前（Phase 5）Human Owner 最小行動
1. 建 GitHub repo、接 Vercel、啟用 CI。
2. （Claude 尚未初始化 git）決定 repo 初始化 / 首次 commit 方式。
3. 閱讀並回覆 **Worker hosting Architecture Question**（[07](./07-current-status.md)）。
