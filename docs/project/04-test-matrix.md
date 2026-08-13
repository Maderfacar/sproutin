# 04 — Test Matrix

> **Human Owner 已決定：不要求在本機執行開發環境。** 主要 workflow：
> ```text
> Claude Implementation → Git Commit → Push → CI → Vercel Preview → Online Verification → Human Acceptance
> ```
> 因此**不把 `pnpm dev` / `localhost` 當作 Human Owner 的必要驗收流程**。
> 但——**不在本機測 ≠ 不測**。驗證責任移到 **CI + Preview + Online**。

## 1. CI 責任（最低要求）
CI（`.github/workflows/ci.yml`）至少負責：

| 步驟 | 內容 | 目前 |
|------|------|------|
| install | `pnpm install --frozen-lockfile` | ✅ 已定義 |
| dependency validation | frozen lockfile | ✅ |
| Prisma generate | `pnpm db:generate` | ✅ |
| typecheck | `pnpm typecheck` | ✅ |
| automated tests | `pnpm test` | ✅ |
| build | `pnpm build` | ✅ |
| **lint** | `pnpm lint` | ❌ **Technical Debt**（ESLint flat config 未建；MVP RC 前補；不得永久忽略） |

> **CI 首次綠燈：2026-08-14，run 31732797734**（install/db:generate/typecheck/test/build 全過）。

## 2. Online Testing 覆蓋（隨 Phase 漸增）

| # | 測項 | 首次適用 Phase/Release | 狀態 |
|---|------|------------------------|------|
| 1 | Web availability | P5 / R1 | ✅ VERIFIED（2026-08-14, Vercel web） |
| 2 | API health `/health` | P5 / R1 | PENDING（待 Render 部署；設定已備 render.yaml healthCheckPath） |
| 3 | Runtime Config（web `/api/public-config`；無 secret / 無 internal URL） | P5 / R1 | ✅ VERIFIED（2026-08-14） |
| 4 | Authentication（LINE Login → JWT） | P6 / R2 | NOT_STARTED |
| 5 | LIFF（init、WebView） | P6 / R2 | NOT_STARTED |
| 6 | User identity（LINE ID ≠ User ≠ Student） | P6 / R2 | NOT_STARTED |
| 7 | Student relationship（Guardianship / TeacherAssignment） | P6 / R2 | NOT_STARTED |
| 8 | RBAC（role check） | P6 / R2 | NOT_STARTED |
| 9 | Scope（row-level） | P6 / R2 | NOT_STARTED |
| 10 | Parent isolation | P6 / R2 | NOT_STARTED |
| 11 | Teacher class isolation | P6 / R2 | NOT_STARTED |
| 12 | Leave（狀態機 / 審核 config） | P7 / R3 | NOT_STARTED |
| 13 | Attendance（手動 + 投影） | P7 / R4 | NOT_STARTED |
| 14 | **Leave / Attendance 衝突規則（ADR-002）** | P7 / R4 | NOT_STARTED |
| 15 | Message（Student-centered、scope） | P7 / R5 | NOT_STARTED |
| 16 | Announcement | P7 / R5 | NOT_STARTED |
| 17 | Notification | P7 / R6 | NOT_STARTED |
| 18 | LINE Push | P7 / R6 | NOT_STARTED |
| 19 | Audit（transactional + out-of-band + DENIED + 敏感 READ 白名單） | P7 / R6 | NOT_STARTED |
| 20 | Error handling（信封格式、不洩敏感） | P7+ | NOT_STARTED |
| 21 | Multi-school isolation | P8 / R7 | NOT_STARTED |
| 22 | Secret exposure（bundle / public config / logs 無 secret） | P5+（持續） | ✅ VERIFIED（web /api/public-config 無 secret / 無 API_INTERNAL_URL, 2026-08-14）；API 部署後再複查 |
| 23 | Mobile UI（LIFF WebView + 手機瀏覽器） | P6+ | NOT_STARTED |

## 3. 測試層級對應
- **Static / typecheck**：CI。
- **Automated unit / integration**：CI（jest；Phase 7 起含 guard/event/leave-attendance 測試）。
- **Build**：CI（api nest build、web next build）。
- **Vercel Preview**：每次 push 產生 Preview，供 Online 驗證。
- **Online manual acceptance**：Human Owner 依上表逐項。

## 3b. 後端部署驗證（Phase 5 Backend / Render，ADR-006）

> Human Owner 於 Render 以 `render.yaml` 部署後，與 Claude 一起線上驗證：

| 項目 | 驗證方式 | 狀態 |
|------|----------|------|
| API 可啟動（Render web Live） | https://sproutin-api.onrender.com Live | ✅ VERIFIED (2026-08-14) |
| `/health` 可訪問 | `{"status":"ok"}` | ✅ VERIFIED |
| `/config/public` 可正常工作 | 正確回傳，無 secret | ✅ VERIFIED |
| Web → API communication | web 設 `API_INTERNAL_URL` 後 /api/public-config 走 API | PENDING（待 Vercel 設 env） |
| API → PostgreSQL | app 成功啟動（$connect 成功） | ✅ VERIFIED |
| Worker → Redis | worker log「ready — connected to Redis」 | ✅ VERIFIED |
| Worker 處理 test job | worker log「self-test OK — job ping completed」 | ✅ VERIFIED |
| Secret 未暴露 client | /config/public 無 secret / 無 API_INTERNAL_URL | ✅ VERIFIED |
| Render deployment 正常 | 4 resource 全綠 | ✅ VERIFIED |

## 4. 現況
- **前端（web）**：#1 Web availability、#3 Runtime Config、#22 Secret exposure、CI green → ✅ VERIFIED / Frontend ACCEPTED。
- **後端（Render）**：#2 及 §3b 各項 → PENDING（設定已備，待 Human Owner 部署）。
- 其餘 NOT_STARTED，隨對應 Phase 展開。
