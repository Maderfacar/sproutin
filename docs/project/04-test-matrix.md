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

## 2. Online Testing 覆蓋（隨 Phase 漸增）

| # | 測項 | 首次適用 Phase/Release | 狀態 |
|---|------|------------------------|------|
| 1 | Web availability | P5 / R1 | ✅ VERIFIED（2026-08-14, Vercel web） |
| 2 | API health `/health` | P5 / R1 | PENDING（API 未部署，AQ-2） |
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

## 4. 現況（Phase 5 / R1）
- 測項 #1–3、#22 為本階段目標，狀態 **PENDING**（尚未 push → 尚無 CI/Preview）。
- 其餘 NOT_STARTED，隨對應 Phase 展開。
