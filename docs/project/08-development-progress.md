# Sproutin Development Progress

> **這份是 Human Owner 的主要「持續跟讀」文件。** 只回答：現在在哪裡？完成什麼？還缺什麼？誰要做什麼？下一步是什麼？
> 它是**導航**，不是 Source of Truth。真正的真相在：Architecture → `docs/00-09` + `docs/adr/`；Project Control → `docs/project/`。
> Last updated: 2026-08-16（Phase 7 Step 6 — Audit out-of-band durable path + 稽核查詢端點 IMPLEMENTED;待 CI + Render 線上 + Human Acceptance）

---

## Current Position

**Phase:**
Phase 7 — Core MVP（進行中）。Phase 6 — Vertical Slice ✅ COMPLETE（2026-08-14, Human Owner）。

**Milestone:**
Phase 7 Step 1/2/3/4 → ✅ **ACCEPTED**。
Step 5（LINE Push）→ **IMPLEMENTED**（線上驗證卡 Human Owner 填 Messaging token + LINE 好友/provider）。
Step 6（Audit out-of-band durable path + 稽核查詢端點）→ ✅ **ACCEPTED**（2026-08-16, Human Owner;CI 綠 run 31904698836 + Render 線上 `/audit-logs` 401 missing_token/invalid_token + 帶 token 流程由 CI e2e 覆蓋）。append-only DB 層鎖死拆下一版（§D 提案）。

**Status:**
```text
Phase 5:  ✅ ACCEPTED（2026-08-14）
Phase 6:  ✅ COMPLETE（2026-08-14, Human Owner）— Step 1–4 全數 ACCEPTED
Phase 7:  IN_PROGRESS（Core MVP;前端排法 = 後端優先，主題/色彩/園方設定於 Step 7）
  Step 1 Leave 狀態機（+寫入端 Outbox +transactional audit）→ ✅ ACCEPTED（2026-08-15, Human Owner）
  Step 2 Attendance（手動 SoT + ADR-002 override-on-edit）      → ✅ ACCEPTED（2026-08-15, Human Owner）
  Step 3 Event 串接（Outbox → Worker dispatch;投影+回滾+Notification）→ ✅ ACCEPTED（2026-08-15, Human Owner）
  Step 4 Message / Announcement / Notification（站內讀取端）    → ✅ ACCEPTED（2026-08-15, Human Owner）
  Step 5 Notification / LINE Push                              → IMPLEMENTED（待 push + CI;線上驗卡 Human Owner 填 Messaging token + LINE 設定）
  Step 6 Audit out-of-band durable path + 稽核查詢端點          → ✅ ACCEPTED（2026-08-16, Human Owner）
    └ append-only DB 層鎖死（決策 2）→ 拆下一版獨立 release（§D 提案;本版先程式自律）
  Step 7 Dashboard / Branding / Feature Flag                   → NOT_STARTED
```

---

## Current Objective

**Phase 7 Step 6 — ✅ ACCEPTED（2026-08-16, Human Owner）。** Audit 已補齊 out-of-band durable path（DENIED / FAILURE / 敏感 READ
→ durable BullMQ `audit` 佇列 + DLQ + 無 Redis 降級 → Worker 寫入 AuditLog）+ 稽核查詢端點 `GET /audit-logs`。
**下一步（先計畫→確認→實作）**：append-only DB 層鎖死（決策 2 說好的獨立 release）—— Claude 以 06 §D 格式提案
（least-privilege app role + REVOKE + 新 secret + 換連線），等 Human Owner 定案;之後進 Step 7。

---

## Current Task

Phase 7 Step 6 — Audit out-of-band + 稽核查詢端點 — ✅ **ACCEPTED**（2026-08-16, Human Owner）。
依據：CI 綠（run 31904698836，build + db + docker-build）;commit b4f8446 上線;Render 線上 `/audit-logs` 無 token → 401 missing_token、壞 token → 401 invalid_token（路由 + 守衛部署）;帶 token 的 DENIED/FAILURE/READ 流程由 CI e2e（真實 JWT）+ 單元測試覆蓋（Step 1–4 慣例）。
下一步 = append-only DB 層鎖死的 §D 提案（下一版），或 Step 7（Dashboard·Branding·Feature Flag）—— 先計畫 → Human Owner 確認 → 實作。

Phase 6 成果（全數 ACCEPTED）：
```text
Step 1  DB baseline migration 0001_init + synthetic demo seed
Step 2  LINE/LIFF 登入 → Sproutin JWT（LINE ID 僅認證）
Step 3  RBAC 骨架 RolesGuard + ScopeGuard（後端授權）
Step 4  端到端讀取切片 GET /me/students + LIFF Dashboard（後端過濾）
線上：Web(Vercel) + API/Worker(Render) + PostgreSQL + Redis;27 tests + db job CI 綠
```

---

## Completed

```text
[x] Phase 0–4（Product / Stack / Architecture / Domain-DB-RBAC-Event-API / Architecture Gate）— ACCEPTED
[x] Architecture v1.1 clarifications ×3 — ACCEPTED
[x] ADR-001 ~ ADR-005 — ACCEPTED
[x] Project Control Documentation（docs/project/00-08）— ACCEPTED
[x] Project Skeleton — Frontend（Vercel web）— ACCEPTED（2026-08-14）
[x] CI green（install/db:generate/typecheck/test/build）— VERIFIED
[~] Project Skeleton — Backend deployment config（Render）— IMPLEMENTED（待 Human Owner 部署驗證）
[x] AQ-1 / AQ-2 部署決策 — DECIDED（ADR-006：Vercel + Render）
[x] Phase 5（整體）— ACCEPTED（2026-08-14, Human Owner）
[x] Phase 6 Step 1 — DB migration + seed — ACCEPTED（2026-08-14, Human Owner）
[x] Phase 6 Step 2 — LINE / LIFF 登入骨架 — ACCEPTED（2026-08-14, Human Owner）
[x] Phase 6 Step 3 — RBAC 骨架（RolesGuard + ScopeGuard）— ACCEPTED（2026-08-14, Human Owner）
[x] Phase 6 Step 4 — 端到端讀取切片（/me/students + LIFF Dashboard）— ACCEPTED（2026-08-14, Human Owner）
[x] **Phase 6 — Vertical Slice — COMPLETE（2026-08-14, Human Owner）**
```

> `[~] IMPLEMENTED` 代表 code 已寫，**不等於 Human Acceptance**。

---

## Verification Pending

> Human Owner 不使用本機開發環境；以下由 **CI / Vercel Preview / Online** 自動或線上驗證，**不要求 Human Owner 跑 localhost**。

```text
[x] pnpm install / dependency installation      → CI ✅ VERIFIED
[x] Prisma generate                              → CI ✅
[x] Typecheck                                    → CI ✅
[x] Automated tests                              → CI ✅
[x] Build（api nest build + web next build）      → CI ✅
[x] CI green                                       → CI ✅（run 31732797734）
[x] Vercel（web）Production deployed               → Vercel ✅
[x] Web loads                                       → Online ✅
[x] Runtime Config（web /api/public-config）        → Online ✅
[x] Secret exposure（web，無 API_INTERNAL_URL/secret）→ Online ✅
[ ] /health                                          → BLOCKED：API 未部署（AQ-2）
[ ] /config/public（後端 API）                        → BLOCKED：API 未部署（AQ-2）
```

剩餘僅 `/health`、`/config/public`（後端 API 端點）+ Human Owner 正式驗收。

---

## In Progress

- Backend deployment（Render）：Claude 設定已完成（IMPLEMENTED）；等 Human Owner 於 Render 以 `render.yaml` Blueprint 部署 → 一起線上驗證。

---

## Blocked

```text
BLOCKED: (soft) 後端線上驗證尚未能開始

Reason:
Render 部署設定（render.yaml / Dockerfile / main.ts / worker.ts）已備；尚待 Human Owner 於 Render 部署。

Waiting for:
Human Owner（建 Render 帳號 + 連接 GitHub + Blueprint 部署）

Required decision:
無（決策已於 ADR-006 定案）。
```

（非架構性硬阻塞；純平台部署接線。）

---

## Technical Debt

```text
1. ESLint flat config
   - Priority: Medium
   - Required before: Phase 8 — MVP Release Candidate（R7）
   - Owner: Claude(impl) / Human(accept)
   - Note: 目前 CI 暫略 lint；不得因換 Phase 而遺忘。

2. ~~AuditLog append-only 未於 DB 權限層強制~~ → ✅ RESOLVED（Phase 7 Step 6 決策 A，migration 0002）
   - 手段: trigger 擋 AuditLog UPDATE/DELETE/TRUNCATE（RAISE EXCEPTION;即使 owner 連線也擋）。
     純 expand migration、零 infra、對線上無風險。CI db job 斷言 INSERT 允許 / 改·刪·清空被擋。
   - 未來 hardening（非必要）: least-privilege app role 分離（防 superuser 層級 tampering，
     需新 secret + 換連線，ADR-003 破壞性變更）→ Phase 8+ 正式營運/合規前評估。
```

---

## Architecture Questions

```text
AQ-1 — Worker / BullMQ Production Hosting   → DECIDED（2026-08-14, ADR-006）
AQ-2 — API (NestJS) Production Hosting      → DECIDED（2026-08-14, ADR-006）

決策：架構不變，僅定部署位置——
  Vercel: Web ｜ Render: API + Worker ｜ Managed Redis（Render Key Value）｜ Managed PostgreSQL
詳見 docs/adr/ADR-006-deployment-hosting.md。

目前無待決 Architecture Question（None open）。
```

---

## Human Owner Action Required

```text
DONE
- Phase 5 全綠並驗收（Vercel + Render + CI + Web→API）；AQ-1/AQ-2 → ADR-006

DONE
- ✅ Phase 6 Step 1 — ACCEPTED（2026-08-14）
- ✅ LINE Login channel + LIFF app 建立（LIFF_ID=2011106015-hbS1EASz）+ Messaging channel

DONE
- ✅ Phase 6 — Vertical Slice — COMPLETE（2026-08-14）: Step 1–4 全數 ACCEPTED

NOW（Phase 7 前置；可並行準備）
- 無硬性待辦。Phase 7 = Core MVP（Leave/Attendance/Message/Announcement/Notification·LINE Push/Audit/Dashboard·Branding·Feature Flag）
- LINE Push（Phase 7）需 Messaging channel secret/token → 屆時於 Render 填 `LINE_MESSAGING_CHANNEL_SECRET`/`LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`（sync:false）
- 於新 session 啟動 Phase 7;Claude 先提 Phase 7 計畫 → 確認 → 實作
```

---

## Next Task

```text
Step 6 已 ACCEPTED（2026-08-16）。下一步二選一，皆先計畫 → Human Owner 確認 → 實作：
  A. append-only DB 層鎖死（決策 2 說好的獨立 release）：Claude 以 06 §D 格式提案 —— least-privilege
     app role（只授 AuditLog INSERT/SELECT）+ REVOKE UPDATE/DELETE + 新 secret（APP_DATABASE_URL）
     + runtime 換連線（migrate 續用 owner）。屬 infra/ADR-003 破壞性變更，等 Human Owner 定案。
  B. Step 7 — Dashboard / Branding / Feature Flag。
  平行未了項：Step 5 線上「真的收到 LINE 推播」仍卡 Human Owner 前置（Messaging token + LINE 好友/provider）。
```

---

## Next Acceptance Gate

```text
Phase 6 — Step 4 Acceptance Gate（端到端讀取切片）— ✅ 通過 → Phase 6 COMPLETE
[x] 後端 GET /me/students 過濾（家長自己小孩 / 老師自班 / OWNER 全校）+ 最小 Dashboard
[x] CI 綠燈（run 31792055646；27 tests + db job）+ Render 部署（/me/students 401）
[x] 修 LIFF 過期 token（偵測 exp → 強制重新登入）
[x] 線上：園長手機 Dashboard 顯示（王園長 OWNER + 學生清單）
[x] Human Owner acceptance（Step 4）— 2026-08-14 → **Phase 6 COMPLETE**

下一個 Gate：Phase 7 — Core MVP（各模組 Online 驗收）。
```

```text
Phase 6 — Step 3 Acceptance Gate（RBAC 骨架）— ✅ 通過（保留紀錄）
[x] RolesGuard（@Roles）+ ScopeGuard（@Scope）+ ScopeResolver（student）
[x] 測試矩陣：老師自班 allow/他班 deny;家長自己小孩 allow/他人 deny;OWNER/ADMIN 全校（本機 21 tests 綠）
[x] 套用到示範讀取端點 GET /students/:id（前端不決定授權）
[x] CI 綠燈（run 31783265302；build 22 tests + db job）+ 修 deploy DI bug（JwtModule export + smoke test）
[x] Render 線上部署成功：/students/:id 401（守衛生效）
[x] Human Owner acceptance（Step 3）— ✅ 2026-08-14
```

```text
Phase 6 — Step 2 Acceptance Gate（LINE / LIFF 登入骨架）— ✅ 通過（保留紀錄）
[x] AuthModule + /config/public(DB) + /liff 前端 + seed liffId/owner 對映 + env 拆分
[x] CI 綠燈（run 31777136725）+ 線上手機實測 PASS（王園長 OWNER）
[x] Human Owner acceptance（Step 2）— 2026-08-14
```

```text
Phase 6 — Step 1 Acceptance Gate（DB migration + seed）— ✅ 通過（保留紀錄）
[x] Baseline migration 0001_init 無 drift；seed idempotent + guard；verify 斷言（RBAC/ADR-002）
[x] CI「db」job 綠燈（run 31772685822）
[x] Render preDeploy migrate 套用（0001_init applied）+ seed one-off job（counts 符合）
[x] Human Owner acceptance（Step 1）— 2026-08-14

---

Phase 5 Backend Acceptance Gate（已完成，保留紀錄）

Frontend（已達成）
[x] Vercel Web deployed / loads
[x] Runtime Config verified（/api/public-config）
[x] No secret exposure（web）
[x] CI green

Backend（Render 部署 2026-08-14，已驗證）
[x] API 可啟動（sproutin-api Live, https://sproutin-api.onrender.com）
[x] /health 可訪問（{"status":"ok"}）
[x] /config/public 可正常工作（無 secret）
[x] Web → API communication（Vercel API_INTERNAL_URL → Render；schoolSlug="dev" 來自後端）
[x] API → PostgreSQL 正常（app 啟動 = $connect 成功）
[x] Worker → Redis 正常（log: ready — connected to Redis）
[x] Worker 可取得並處理測試 job（log: self-test OK — job ping completed）
[x] Secret 未暴露給 client
[x] Render deployment 正常（4 resource 全綠）
[x] Online verification 通過（/health、/config/public）
[x] Human Owner acceptance ✅（2026-08-14）— Phase 5 ACCEPTED
```

前端已 ACCEPTED；後端各項待 Render 部署後線上驗證，全部符合 + Human Owner acceptance 後，`Phase 5` 整體才標 `ACCEPTED`，才進 Phase 6。

---

## Latest CI

```text
Commit:  b4f8446（feat(audit): Phase 7 Step 6 — out-of-band durable audit + 稽核查詢端點）
Run:     31904698836
Status:  ✅ SUCCESS（build + db + docker-build 全綠）
Date:    2026-08-16
Note:    僅 Node 20 deprecation 警告（非致命）。線上 /audit-logs → 401 missing_token/invalid_token。
```

---

## Latest Vercel Preview

```text
Deployment:  https://sproutin-kb91-theta.vercel.app （apps/web, Production）
Status:      Ready — Web availability / Runtime Config / Secret-exposure VERIFIED
Date:        2026-08-14
Note:        僅前端 web；後端 API 部署於 Render（render.yaml），待部署驗證
```

---

## Latest Accepted Commit

```text
Phase 7 Step 6 — ACCEPTED（2026-08-16, Human Owner）
  Audit out-of-band durable path（DENIED/FAILURE/敏感 READ → `audit` 佇列 + DLQ + 無 Redis 降級 → Worker 寫入）
  + 稽核查詢端點 GET /audit-logs（OWNER/ADMIN、篩選、分頁）。ref commit b4f8446（main）。
  append-only DB 層鎖死（決策 2）拆下一版獨立 release（§D 提案）。
Next: append-only §D 提案 / Step 7（Dashboard·Branding·Feature Flag）—— 先計畫→確認→實作。
```

---

## Recent Work Log

### 2026-08-16 — Phase 7 / Step 6 — ACCEPTED（Human Owner）

Completed:
- Human Owner 驗收 **Step 6（Audit out-of-band durable path + 稽核查詢端點）** → ACCEPTED。依據：CI run 31904698836 綠（build + db + docker-build）;commit b4f8446 上線;Render 線上 `/audit-logs` 無 token → 401 `missing_token`、壞 token → 401 `invalid_token`（路由 + 守衛部署）。帶 token 的 DENIED/FAILURE/READ 完整流程由 CI e2e（真實 JWT，已實際觸發 DENIED enqueue）+ 單元測試覆蓋（後端優先無 UI，比照 Step 1–4 慣例，Human Owner 認可）。
- append-only DB 層鎖死（決策 2）確認拆**下一版獨立 release**（列入 Technical Debt）。

Next:
- 二選一，皆先計畫 → 確認 → 實作：**A.** append-only DB 層鎖死的 06 §D 提案（infra/ADR-003 破壞性變更，需 Human Owner 定案）;**B.** Step 7（Dashboard / Branding / Feature Flag）。

### 2026-08-16 — Phase 7 / Step 6 — Audit out-of-band durable path + 稽核查詢端點（IMPLEMENTED）

Completed:
- **API 端 out-of-band audit producer**（`core/audit/audit-enqueuer.service.ts`）：DENIED/FAILURE/敏感 READ → enqueue durable BullMQ `audit` 佇列（Redis + retry/backoff + DLQ）。**永不阻塞/永不丟出**;`REDIS_URL` 未設定或 enqueue 失敗 → 降級輸出 structured ERROR log（ADR-005 last-resort）;Redis 連線 lazy（無 Redis 環境啟動不連線）。沿用既有 `bullmq`/`ioredis`，**無新 library**。
- **DENIED 落地**：`RolesGuard`/`ScopeGuard` 擋下 → `enqueue(result=DENIED)`（actor/action/resource/scope，fire-and-forget）。`AuditService` 加 `recordStandalone`（out-of-band 單筆 INSERT）+ 注入 PrismaService;`AuditModule` 加 `AuditEnqueuer`;`AuthModule` re-export `AuditModule`（guards 在 consumer 模組 context 需解析 `AuditEnqueuer`，比照既有 JwtModule re-export）。
- **FAILURE 攔截**：全域 `AuditFailureInterceptor`（`APP_INTERCEPTOR`）——狀態變更請求（POST/PUT/PATCH/DELETE）的 5xx → `enqueue(result=FAILURE)` 後原樣 rethrow;**刻意不記 4xx**（驗證/衝突噪音）。
- **敏感 READ 白名單**：`@AuditRead` 裝飾器 + 全域 `AuditReadInterceptor`，僅掛 `GET /students/:id`（`student.read`）與 `GET /messages`（`message.read`）;一般清單/GET 不記（ADR-005，決策 3）。
- **稽核查詢端點**（`audit-logs/**`）：`GET /audit-logs`，`@Roles('OWNER','ADMIN')`;篩選 resourceType/resourceId/actor/from/to;分頁 limit（≤100）/offset + `meta.total`;查詢本身記 `audit.read`（決策 4）。
- **Worker `audit` consumer**（`worker.ts`）：新增第三條佇列 consumer → `AuditService.recordStandalone` INSERT 進 AuditLog（append-only）;丟出→BullMQ 重試→failed set 作 DLQ。boot guard 未動。
- **設計決策（Human Owner，全選建議）**：1=佇列（非請求路徑直寫）;2=append-only 本版先「程式自律」（DB 層鎖死拆下一版）;3=只記 students/:id + messages;4=查稽核記 audit.read。

Verification:
- 本機：typecheck ✓;jest **126 tests** ✓（+13：enqueuer 降級、DENIED×2 guard、FAILURE 攔截×3、READ 攔截×3、audit-logs 查詢×4、worker consumer wiring;`recordStandalone`）;`pnpm build` ✓;`node dist/main.js` boot ✓（`/audit-logs` route mapped、DI 無誤）;`node dist/worker.js` 無 REDIS_URL → exit 1 ✓（新 audit consumer 在 boot guard 之後，無回歸）;`app.module.spec` + `worker.boot.spec` DI smoke 涵蓋新 provider/攔截器/consumer。**e2e 的 403 案例自然觸發 DENIED enqueue**（無 Redis → 降級 log 可見，等於端到端證明 guard→enqueue 線通）。
- 待：push → CI 綠（build + db + docker-build）→ Render 線上（無權限請求→AuditLog DENIED 列;`GET /audit-logs` OWNER 回列）→ Human Acceptance。

Architecture:
- **無變更**。無新 migration（AuditLog/OutboxEvent 已在 `0001_init`）、無新 library（BullMQ/ioredis/rxjs 既有）、**不動基礎設施**。append-only DB 層強制（least-privilege app role + REVOKE + 新 secret + 換連線）屬 infra/ADR-003 破壞性變更 → 依決策 2 拆**下一版獨立 release**，屆時以 06 §D 提案由 Human Owner 定案（列入 Technical Debt）。

Human Owner:
- NOW：確認是否 commit + push（push main 觸發 Render/Vercel 自動部署）。

Next:
- Step 6 acceptance → append-only 鎖死（下一版 §D 提案）/ Step 7（Dashboard·Branding·Feature Flag）。

### 2026-08-15 — Phase 7 / Step 5 — Notification / LINE Push（IMPLEMENTED）

Completed:
- **`LinePushClient`**（`events/line-push.client.ts`）：呼叫 LINE Messaging `push` API（純文字）;token 來自 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`（ADR-004 secret）—— 未設定則略過（dev/CI 安全）;非 2xx→丟出交 BullMQ 重試。
- **`PushNotificationService`**：**只推重點事件**（Human Owner 決策）—— `LeaveApproved`/`LeaveRejected`→家長;`MessageSent`→家長+老師（排除發訊者）;`LeaveSubmitted`/`LeaveCancelled`/`AnnouncementPublished`/`AttendanceMarked` 不推。收件人沿用 `RecipientsService`（與站內通知同源）;`userId`→`lineUserId` 由 `LineIdentity` 對映;未綁 LINE 自動略過。
- **`worker.ts`**：新增 `line-push` BullMQ 佇列 + consumer;events consumer 於 `markDispatched` 後 enqueue 推播（**best-effort + BullMQ 重試**;失敗進 failed set 作 DLQ）—— 站內通知一定成立，LINE 推播盡力送（Human Owner 決策）。
- **`render.yaml`**：`sproutin-worker` 加 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`（sync:false）。
- **設計決策（Human Owner）**：只推重點（核准/駁回/新訊息）;可靠度=盡力送+重試（不加第二層 outbox）。

Verification:
- 本機：typecheck ✓;jest **113 tests** ✓（+4：只推重點、排除發訊者、未綁 LINE 略過、非重點不推）;`pnpm build` ✓;worker DI smoke（`worker.boot.spec`）涵蓋新 provider;`node dist/worker.js` boot guard ✓。
- **線上驗證卡 Human Owner 前置**（程式無法自證收到推播）：① Render 填 Messaging access token ② LINE 後台確認 Login/Messaging 同 provider（userId 一致）③ 收播者加 OA 好友。

Architecture:
- **無變更**。無新 migration、無新 library（沿用 BullMQ;`fetch` 為 Node 20 內建）。沿用 Step 3 dispatcher，新增一條 `line-push` 佇列（docs/06 §1 async 副作用）。

Human Owner:
- NOW：確認是否 commit + push。之後備妥 Messaging token + LINE 好友/provider → 線上實測收到推播 → Acceptance。

Next:
- Step 5 acceptance → Step 6（Audit out-of-band durable path + append-only REVOKE + 稽核查詢端點）。

### 2026-08-15 — Phase 7 / Step 4 — ACCEPTED（Human Owner）

Completed:
- Human Owner 驗收 **Step 4（Message / Announcement / Notification 站內讀取端）** → ACCEPTED。依據：CI run 31863276030 綠（build + db + docker-build）;commit aa48a36 上線;線上 `/messages`、`/announcements`、`/notifications` 無 token 皆回 401（路由部署 + guard 生效）。

Next:
- **Step 5 — Notification / LINE Push**。先計畫 → Human Owner 確認 + 於 Render 填 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` + 確認 Messaging OA 好友/provider（userId 一致）→ 實作。

### 2026-08-15 — Phase 7 / Step 4 — Message / Announcement / Notification（IMPLEMENTED）

Completed:
- **Notifications 讀取端**（`apps/api/src/notifications/**`）：`GET /notifications?unread=`（本人，userId 過濾，不需 ScopeResolver）+ `PATCH /notifications/:id/read`（idempotent;他人→403、不存在→404）。
- **Messages**（`apps/api/src/messages/**`，**雙向** — Human Owner 決策）：`POST /messages`（校方↔家長皆可，綁 student;classId 由 DB 推導不信任前端）、`GET /messages?studentId=`（+ 本人 isRead）、`PATCH /messages/:id/read`（MessageRead upsert）。授權 `canAccessStudent`;同交易寫 Message + `OutboxEvent(MessageSent)` + `AuditLog(message.send)`。
- **Announcements**（`apps/api/src/announcements/**`）：`POST /announcements`（SCHOOL→OWNER/ADMIN;CLASS→OWNER/ADMIN 或 TEACHER 自班）、`GET /announcements`（可見範圍：全校公告 + 使用者相關班級公告）。同交易寫 Announcement + `OutboxEvent(AnnouncementPublished)` + `AuditLog(announcement.publish)`。
- **Worker handler 擴充**（沿用 Step 3 dispatcher，docs/06 §6 訂閱既有機制、不改既有 domain）：`MessageEventHandler`（通知該生家長+老師、**排除發訊者**）、`AnnouncementEventHandler`（全校→所有 User;班級→該班老師+該班學生家長）;`EventHandlersService` 加 MessageSent / AnnouncementPublished 路由;`RecipientsService` 加 `forClass` / `allUsers`;`WorkerModule` 註冊兩新 handler。
- **設計決策（Human Owner）**：訊息**雙向**;公告發布權限/可見範圍照建議;一次做完三塊。

Verification:
- 本機：typecheck ✓;jest **109 tests** ✓（+23：notifications 6 / messages 8 / announcements 7 / 事件 handler 通知 3 —— 涵蓋雙向 scope、override 無關、收件人排除發訊者、公告可見範圍）;`pnpm build` ✓;`node dist/main.js` boot ✓（`/messages`·`/announcements`·`/notifications` 全部路由 mapped、DI 無誤，僅在無本機 DB 時 P1001）。
- `app.module.spec`（API DI）與 `worker.boot.spec`（Worker DI）已自動涵蓋三個新 module + 兩個新 handler 的 wiring。
- 待：push → CI 綠（build + db + docker-build）→ Render 線上路由 401 → Human Acceptance。

Architecture:
- **無變更**。無新 migration（Message/MessageRead/Announcement/Notification 已在 `0001_init`）。無新 library。事件經既有 Outbox + Step 3 dispatcher 交付（新增訂閱點，非改既有模組）。

Human Owner:
- NOW：確認是否 commit + push（觸發 Render 自動部署）。Step 3 驗收 docs 也會一併帶上。

Next:
- Step 4 acceptance → Step 5（Notification / LINE Push，需 Messaging channel secret）。

### 2026-08-15 — Phase 7 / Step 3 — ACCEPTED（Human Owner）

Completed:
- Human Owner 驗收 **Step 3（Event 串接：Outbox → Worker dispatch）** → ACCEPTED。依據：CI run 31862077030 綠（build + db + 新 docker-build job）;程式已上線（commit c1b335e，Render 自動部署）。
- Tech debt「CI 未建置 Docker image」隨本步 docker-build job 一併 RESOLVED。

Next:
- **Step 4 — Message / Announcement / Notification（站內讀取端）**。Claude 先提計畫 → Human Owner 確認 → 實作。

### 2026-08-15 — Phase 7 / Step 3 — Event 串接（IMPLEMENTED）

Completed:
- **新 module `apps/api/src/events/**`**（Outbox → Worker dispatch，docs/06 §2-4 / ADR-002）：
  - `OutboxDispatcherService`：`claimBatch`（撈 PENDING → status-guard 樂觀鎖翻 `PROCESSING`，等效 SKIP LOCKED，不重複派發）、`markDispatched`/`markFailed`、`resetStaleProcessing`（啟動 reaper 退回遺留 PROCESSING）。`OutboxEvent.status` 為自由 String → 新增 PROCESSING/DISPATCHED/FAILED 值**零 migration**。
  - `LeaveEventHandler`：`LeaveApproved` 逐日投影 `Attendance(status=LEAVE, source=LEAVE_EVENT, sourceRef/derivedFrom=leaveId)`，**override 感知**（當日已 `MANUAL` → 不覆寫、發 `attendance.override_conflict`）;`LeaveRejected/Cancelled` 只刪 `LEAVE_EVENT AND sourceRef=leaveId`，`MANUAL AND derivedFrom=leaveId` 不觸碰、發衝突通知;idempotent（@@unique upsert + source 判斷、回滾以 sourceRef 定位）。
  - `EventHandlersService`（事件路由，未來新事件的訂閱點）、`RecipientsService`（studentId→家長/老師/OWNER·ADMIN）、`NotificationService`（站內 Notification）、`day-key`（UTC 午夜逐日，對齊 seed/`@@unique([studentId,date])`）、`WorkerModule`（精簡 DI 圖）。
- **`worker.ts` 改寫**：`NestFactory.createApplicationContext(WorkerModule)`（重用 PrismaService/AuditService，不複製業務碼）+ Outbox poller → BullMQ `events` 佇列（jobId=outbox.id 去重）→ consumer 跑 handler → 標 DISPATCHED;retry/backoff/DLQ 由 BullMQ 提供。
- **CI `docker-build` job**（清 tech debt「CI 未建置 Docker image」）：`docker/build-push-action`，push:false，用同一 `ops/deploy/Dockerfile.api` 在 CI 真實建置，堵住 Docker-context 與 CI 分歧的錯誤（前例：漏 COPY tsconfig.base.json）。
- **設計決策（Human Owner 確認：就照建議做）**：1=Outbox+BullMQ relay;2=Nest context 重用;3=收件人（Submitted→審核者、Approved→家長+老師、Rejected→家長、Cancelled/conflict→老師+行政、AttendanceMarked MVP 不發）;4=day-key UTC 午夜。

Verification:
- 本機：typecheck ✓;jest **86 tests** ✓（+18：day-key 4 / leave-event.handler 8 / outbox-dispatcher 6 + worker DI boot smoke）;`pnpm build` ✓（`dist/worker.js` + `dist/events/*` 產出）;`node dist/worker.js` 無 REDIS_URL → boot guard exit 1 ✓。
- **worker DI boot smoke test**（`worker.boot.spec.ts`，比照 app.module.spec）：編譯 WorkerModule DI 圖、取得 dispatcher + handler —— 攔截「CI 綠但 worker 啟動崩潰」的 wiring 錯誤（硬性規矩：worker 改用 Nest context 需等價啟動驗證）。
- 待：push → CI 綠（build + db + docker-build）→ Render worker log 觀察 dispatch → API/DB 驗投影/DISPATCHED/Notification → Human Acceptance。

Architecture:
- **無變更**。無新 migration（status String;Attendance/Notification/OutboxEvent/AuditLog 已在 `0001_init`）。無新 library（BullMQ/ioredis/@nestjs/core 皆既有）。

Human Owner:
- NOW：確認是否 commit + push（push main 觸發 Render/Vercel 自動部署;本機未 push docs commit b7bf9c0/c89fa92/48abdfe 一併帶上）。

Next:
- Step 3 acceptance → Step 4（Message / Announcement / Notification）。

### 2026-08-15 — Phase 7 / Step 1 + Step 2 — ACCEPTED（Human Owner）

Completed:
- Human Owner 驗收 **Step 1（Leave 狀態機）+ Step 2（Attendance）** → 兩者 ACCEPTED。
- 依據：CI 綠（run 31840973966，build + db）;Render 線上 `/leaves`、`/attendance` 皆回 401（路由部署 + guard 生效）;帶登入完整流程（201/403/409/override）由 API 級 e2e（真實 JWT）於 CI 覆蓋。
- 驗收方式認可：後端優先下暫無 UI，帶 token 手動實測以 CI e2e 取代（Human Owner 同意）。

Next:
- **Step 3 — Event 串接**（Outbox dispatcher on Worker → LeaveApproved 投影 Attendance[override 感知] + LeaveRejected/Cancelled 回滾 + Notification）。Claude 先提計畫 → Human Owner 確認 → 實作。可能於新 session 執行（見 handoff prompt）。

### 2026-08-15 — Phase 7 / Step 2 — Attendance（IMPLEMENTED）+ Step 1 CI 綠

Completed:
- **Step 1 已 push（commit ef9696c）→ CI 綠**（run 31838405561;build + db 兩 job 皆 success）。
- **修 Render 部署失敗（ef9696c build 失敗，dep-d9vnmtvavr4c739d71a0）**：Root cause = `ops/deploy/Dockerfile.api` **未 COPY `tsconfig.base.json`**（`apps/api/tsconfig.json` extends 它、含 `strict:true`）。Docker build 失去 strict → zod `z.infer` 全欄位變 optional → `leaves.controller.ts:50` TS2345（`parsed.data` 不符 required 的 `CreateLeaveInput`）。CI/本機有完整 repo 故不觸發;Phase 5/6 未踩到（先前 controller 只讀 `parsed.data.idToken`，未把整個物件傳給 required-param）。Fix：Dockerfile COPY 加入 `tsconfig.base.json`。以乾淨重現（移除該檔→重現 TS2345;還原→build 綠 EXIT=0）確認。
- Roadmap 決策（Human Owner）：**前端採「後端優先」** → 各功能可操作頁面 + 主題/色彩/園方設定集中於 **Step 7**;Step 2~6 為後端。
- `AttendanceService`（docs/02 §4a-4b / ADR-002）：手動標記 `source=MANUAL`（SoT，每日一列 upsert）;`GET /attendance?classId=&date=`（staff）/`?studentId=`（家長）;`PATCH /attendance/:id`
- **Override（ADR-002 rule 4）**：改到 `source=LEAVE_EVENT` 列 → 轉 `MANUAL`、記 `overriddenAt/overriddenBy`、保留 `derivedFrom`、清 `sourceRef`;audit `attendance.override`。同交易寫 Attendance + `OutboxEvent(AttendanceMarked)` + `AuditLog`
- 授權：coarse `@Roles` + service `ScopeResolver`（寫=canManageStudentClass、家長讀=canAccessStudent、班級清單=service 內 canManageClass）
- **API 級 e2e**（`src/e2e/api.e2e.spec.ts`，supertest + 真實 JWT）：401/403/400/409 + override —— 涵蓋 Leave + Attendance 完整 HTTP pipeline（Human Owner 要求的線上前把關;新增 devDep supertest）

Verification:
- 本機：typecheck ✓;jest **68 tests** ✓（e2e 9 / attendance 10 / 既有 49）;nest build ✓;`node dist/main.js` DI boot ✓（AttendanceModule + `/attendance` 3 routes;LeavesModule 4 routes）
- push（commit f503fc5 + Dockerfile fix 7493f67）→ **CI 綠**（run 31840973966;build + db）→ **Render 部署成功上線**（先前 build 失敗已修）
- **線上驗證**：`GET /leaves`、`POST /attendance`、`PATCH /leaves/:id/cancel` 無 token 皆回 **401 missing_token**（路由已部署 + guard 生效）。帶登入的完整流程（201/403/409/override）由 CI 的 API 級 e2e（真實 JWT）自動覆蓋。
- 待：Human Acceptance（Step 1 + Step 2）

Architecture:
- 無變更。無新 migration（Attendance + override 欄位/enum 已在 `0001_init`）。新增 devDep `supertest`/`@types/supertest`（僅測試）。
- 範圍界定：Step 2 = 手動 SoT + override-on-edit;`LeaveApproved`→投影 Attendance 與回滾屬 Step 3（需 Worker 消費 Outbox）。

Human Owner:
- ✅ 已 push + 部署成功。**NOW：Step 1 + Step 2 的 Human Acceptance**（線上 401 已驗、CI e2e 覆蓋帶登入流程;若要親自驗帶 token 流程需 JWT，後端優先下暫無 UI → 可依賴 CI e2e）。

Tech Debt（本次暴露）:
- **CI 未建置 Docker image** → Docker build context 與 CI（完整 repo、turbo）分歧的錯誤（如缺 `tsconfig.base.json`）會逃過 CI，只在 Render 才爆。建議 CI 加一個 `docker build -f ops/deploy/Dockerfile.api .` job 作為真實建置把關（比照 Step 3 之後補 app.module DI smoke test 的作法）。

Next:
- Step 2 acceptance → Step 3（Event 串接：Outbox dispatcher on Worker → LeaveApproved 投影 Attendance[override 感知] + LeaveRejected/Cancelled 回滾 + Notification）。

### 2026-08-15 — Phase 7 / Step 1 — Leave 狀態機（IMPLEMENTED）

Completed:
- `LeavesService` 狀態機（docs/02 §4 / docs/06 §2 / docs/07 §4）：config-driven（`leaveRequiresApproval`）— 申請進 PENDING 或直核 APPROVED;審核 PENDING→APPROVED/REJECTED;取消 PENDING|APPROVED→CANCELLED;非法轉移→409 `LEAVE_INVALID_TRANSITION`
- 每個狀態變更於**同一 `$transaction`**：寫/改 Leave + `OutboxEvent`（PENDING;LeaveSubmitted/Approved/Rejected/Cancelled）+ `AuditLog`（transactional，ADR-005 類別一）
- 端點 `POST /leaves`、`GET /leaves?studentId=`、`PATCH /leaves/:id/status`、`PATCH /leaves/:id/cancel`（inline zod、raw 回應，比照 auth.controller）
- 授權：controller `@Roles`（粗粒度）+ service `ScopeResolver`（資料列級）;新增 `ScopeResolver.canManageStudentClass`（OWNER/ADMIN 全校、TEACHER 自班、家長非管理者）。申請看 `canAccessStudent`、審核/staff 取消看 `canManageStudentClass`、家長取消限申請者本人（createdBy）
- `core/audit`：`AuditService.record(tx, entry)` 只做交易內同步寫入（out-of-band 路徑留 Step 6）
- `app.module.ts` 掛 LeavesModule → `app.module.spec` DI smoke test 自動涵蓋

Verification:
- 本機：typecheck ✓;jest **49 tests** ✓（leaves 17 / audit 2 / scope-resolver +5 / 既有 25）;nest build ✓;`node dist/main.js` 實際 boot 過 DI —— LeavesModule 初始化、`/leaves` 4 條 route mapped（Step 3 部署 DI bug 教訓已本機覆核）
- 待：push → CI 綠（build + db job）→ Render 線上打四端點（含 409、查 OutboxEvent/AuditLog 有列）→ Human Acceptance
- **注意**：本步 `LeaveApproved` 寫入 Outbox 但**尚未消費** → Attendance 尚不會投影（Step 2/3）

Architecture:
- 無變更。無新 migration（Leave/OutboxEvent/AuditLog + enum 已在 `0001_init`）。無新 library/infra（`@nestjs/event-emitter` 既有但本步未用;留 Step 3 in-process 事件）。
- 範圍 A 由 Human Owner 定案：Outbox 寫入端 + transactional audit 隨 Leave 模組一起長出;避免 Step 6 回頭重開交易注入 audit。

Human Owner:
- NOW：確認是否 commit + push（push main 觸發 Render/Vercel 自動部署）→ CI 綠 → 線上以園長/家長 JWT + 既有 seed 學生打四端點驗收（Claude 給步驟）。

Next:
- Step 1 acceptance → Step 2（Attendance：手動 SoT / LeaveApproved 投影 Derived + ADR-002 override）。先計畫→確認→實作。

### 2026-08-14 — Phase 6 — Vertical Slice — COMPLETE（Human Owner 驗收通過）

Completed:
- Human Owner 驗收 Step 4：園長手機 LIFF → Dashboard 顯示（王園長 OWNER + 學生清單）
- 過程修一個 LIFF 過期 token 問題（沿用 Step 2 舊 token → LINE verify 拒絕;改為偵測 exp 強制重新登入）
- **Phase 6（Step 1–4）全數 ACCEPTED → Vertical Slice 完成**

Verification:
- 端到端線上驗收通過（LINE Login → JWT → RBAC → 後端過濾 Dashboard）;CI 27 tests + db job 綠

Next:
- Phase 7 — Core MVP（新 session）：Leave/Attendance/Message/Announcement/Notification·LINE Push/Audit/Dashboard·Branding·Feature Flag。先計畫→確認→實作。

### 2026-08-14 — Phase 6 / Step 4 — 端到端讀取切片（IMPLEMENTED）

Completed:
- 後端 `StudentsService.listForUser`（OWNER/ADMIN 全校;TEACHER→TeacherAssignment;PARENT/GUARDIAN→Guardianship;多角色聯集去重）
- 端點 `GET /me/students`（`MeStudentsController`,僅 JwtAuthGuard,過濾在後端 Rule 5/6）+ `/api/me/students` proxy
- 前端 `/liff` 除錯頁 → 最小 Dashboard（歡迎 name/role + 可查看學生清單）
- 測試 listForUser 矩陣(5);共 27 tests。boot 檢查：route {/me/students,GET} mapped、DI 無誤（app.module smoke test 亦綠）

Verification:
- 本機：typecheck ✓;test 27 ✓;build ✓;node dist/main.js boot 過 DI（僅 fake-DB P1001,線上真 DB 正常）
- 待 push 後 CI 綠;線上園長手機 Dashboard

Architecture:
- 無變更。過濾邏輯沿用 Step 3 授權矩陣（docs/05）。隔離由 CI 證明（線上只映園長帳號 → 看全校;完整隔離示範需多映家長帳號）。

Next:
- Step 4 acceptance → **Phase 6 完成** → Phase 7（Core MVP：Leave/Attendance/Message/Audit…）

### 2026-08-14 — Phase 6 / Step 3 — ACCEPTED（Human Owner 驗收通過）

Completed:
- Human Owner 驗收 Step 3（RBAC 骨架）：CI 綠（run 31783265302, 22 tests）+ Render 線上 GET /students/:id 401（守衛生效）
- 過程中抓到並修好 deploy-time DI bug（JwtModule 未 export）→ 補 app.module DI bootstrap smoke test 堵住 CI gap
- Step 3 標記 ACCEPTED

Next:
- Step 4 — 端到端讀取切片（Phase 6 最後一步）。家長看自己小孩 / 老師看自班 / Dashboard 後端過濾。先計畫→確認→實作。

### 2026-08-14 — Phase 6 / Step 3 — RBAC 骨架（IMPLEMENTED）

Completed:
- `@Roles`/`@Scope` 裝飾器;`RolesGuard`(粗粒度)、`ScopeGuard`+`ScopeResolver`(資料列級,docs/05 §3)
- `ScopeResolver.canAccessStudent`：OWNER/ADMIN 全校;TEACHER→TeacherAssignment 比對 student.classId;PARENT/GUARDIAN→Guardianship
- 示範端點 `GET /students/:id`（JwtAuthGuard → RolesGuard → ScopeGuard;`@Roles(...)` + `@Scope('student')`）
- 測試矩陣：scope-resolver(7) + roles.guard(3) + scope.guard(3) → 老師自班 allow/他班 deny、家長自己/他人、OWNER 全通
- 授權全在後端(Rule 5/6);DENIED out-of-band audit 標 TODO(Phase 7, ADR-005)

Verification:
- 本機：typecheck ✓（api+web）;test 22 passed ✓;build ✓
- CI 綠（run 31783265302）;Render 線上部署成功 → GET /students/:id 401（missing_token / invalid_token）守衛生效

Issues:
- Problem: 首個 Step 3 部署（143f0b5）Render 啟動 exit 1。Cause: JwtAuthGuard 經 @UseGuards 於 StudentsModule context 實例化，但 AuthModule 未 export JwtModule → 缺 JwtService。CI 未抓到（不啟動 server）。
  Solution: AuthModule re-export JwtModule + 新增 app.module DI bootstrap smoke test（mock Prisma，CI 攔截此類 wiring 錯誤）。Trade-off: 無。

Architecture:
- 無變更。RBAC 依 docs/05 矩陣。ScopeResolver 目前支援 student 資源;其他資源(class/leave…)於後續 domain 端點擴充。

Human Owner:
- NOW：確認 CI 綠 → Human Acceptance（Step 3）。線上可用既有 demo 帳號打 GET /students/:id 驗正/反例(選用)。

Next:
- Step 3 acceptance → Step 4（端到端讀取切片：家長看自己小孩、老師看自班、Dashboard 後端過濾）

### 2026-08-14 — Phase 6 / Step 2 — ACCEPTED（Human Owner 驗收通過）

Completed:
- Human Owner 驗收 Step 2：CI 綠（run 31777136725）+ 線上手機實測 PASS（真 LINE → LIFF → JWT → /me = 王園長/OWNER）
- Step 2 標記 ACCEPTED

Next:
- Step 3 — RBAC 骨架（RolesGuard + ScopeGuard）。不卡憑證,CI 用 seed 資料驗權限隔離。

### 2026-08-14 — Phase 6 / Step 2 — LINE / LIFF 登入骨架（IMPLEMENTED）

Completed:
- 後端 `apps/api/src/auth/`：`LineVerifier`（LINE `/oauth2/v2.1/verify`,audience=Login channel）、`AuthService`（查 `LineIdentity`→`User`+roles、簽 Sproutin JWT、未 provisioned→401）、`AuthController`（`POST /auth/line/login`、`GET /me`）、`JwtAuthGuard`；接進 app.module
- `/config/public` 改讀 DB `SchoolConfig`（liffId 等公開值;fallback env）
- 前端 `/liff` 登入頁 + same-origin proxy（`/api/auth/line/login`、`/api/me`）;`lib/liff.ts`、`lib/auth.ts`（`@line/liff` 既有）
- seed：`SchoolConfig.liffId=2011106015-hbS1EASz`;`DEMO_OWNER_LINE_USER_ID` env → 對映 `user-owner`（真 ID 不進 repo）
- env 拆 `LINE_LOGIN_CHANNEL_ID`(plain 2011106015) / `LINE_MESSAGING_*`（Phase 7,secret sync:false）;render.yaml + docs/05 更新
- 測試：auth.service（provisioned / 未provisioned / token 無效 / me）+ jwt guard（有效/缺/無效）

Verification:
- 本機：typecheck ✓（api+web）;test 8 passed ✓;build ✓（`/liff` + proxies 編譯）
- CI：run 31777136725 綠（build 8 tests + db job）
- 線上手機實測 PASS：真 LINE 開 `https://liff.line.me/2011106015-hbS1EASz` → JWT 換發 → /me 回「王園長 / OWNER」✓
  （診斷：/liff 顯示解碼 sub;重跑 seed 帶正確 DEMO_OWNER_LINE_USER_ID 後對映園長成功）
- 僅剩 Human Owner Acceptance（Claude 不自行標 ACCEPTED）

Architecture:
- 無變更。LINE User ID 僅認證（修正 D）;public 值走 /config/public（ADR-001）;secret 走 env（ADR-004）。env 命名拆 LOGIN/MESSAGING 為實作細節。

Human Owner:
- NOW：CI 綠 → 改 LIFF Endpoint URL 到 `/liff` → 重跑 seed（帶你的 LINE ID）→ 手機實測 → 驗收

Next:
- Step 2 acceptance → Step 3（RBAC 骨架 RolesGuard + ScopeGuard）

### 2026-08-14 — Phase 6 / Step 1 — ACCEPTED（Human Owner 驗收通過）

Completed:
- Human Owner 正式驗收 Step 1（DB migration + seed）：CI db job 綠 + 線上 migrate applied + 線上 seed counts 符合
- Step 1 標記 ACCEPTED

Next:
- Step 2 — LINE / LIFF 登入骨架。前置：Human Owner 準備 LINE 憑證（Login/LIFF/Messaging API channel）。
- 流程：Human Owner 備妥 → Claude 提 Step 2 計畫 → 確認 → 實作。Claude 不自行開始。

### 2026-08-14 — Phase 6 / Step 1 — DB migration + seed（IMPLEMENTED）

Completed:
- Baseline migration `0001_init`（由 `prisma migrate diff --from-empty` 產生：17 tables / 11 enums / 13 FK / 11 index；純 Expand，ADR-003；`migration_lock.toml`）
- Idempotent synthetic seed `packages/db/prisma/seed.ts`（固定 id upsert；`SEED_DEMO`/`SCHOOL_SLUG=dev` guard）：
  1 School+Config、2 Class、5 Student、6 User+LineIdentity（LINE ID 僅認證佔位）、UserRole、Guardianship（家長多小孩跨班 + 同一小孩多監護人）、TeacherAssignment；
  demo 業務資料：Leave×2（含 ADR-002 override 情境）、Attendance×3（LEAVE_EVENT / MANUAL-override 保留血緣 / 純手動）、Announcement×2
- CI 斷言 `verify.ts`；`render.yaml` `sproutin-api` 加 `preDeployCommand: migrate:deploy`；`.github/workflows/ci.yml` 新增 `db` job（postgres:16 → migrate deploy → seed×2 → verify → drift check）
- 依 Human Owner 3 項決定：migration 機制=Render preDeploy（自動）；seed 範圍=身分/就學圖 + demo 業務資料；套用=CI + 之後也 seed Render dev DB

Verification:
- 本機：`prisma validate` ✓；committed migration == 重新產生（無 drift）✓；`seed.ts`/`verify.ts` typecheck ✓
- CI（run 31772685822）：db job 全綠 — migrate deploy → seed×2（idempotent）→ verify（12 斷言全過）→ drift ✓
- 線上：Render preDeploy 自動 migrate `0001_init applied` ✓；seed one-off job counts 全數符合
  （school1/schoolConfig1/class2/student5/user6/lineIdentity6/userRole6/guardianship3/teacherAssignment2/leave2/attendance3/announcement2）✓
- 僅剩 Human Owner Acceptance（Claude 不自行標 ACCEPTED）

Issues:
- Problem: 本機無 Docker/Postgres、無法跑實際 migrate/seed。Cause: 開發機環境。Solution: 以 CI 拋棄式 postgres:16 為權威驗證 + 本機 drift/typecheck。Trade-off: 實際套用結果須看 CI/線上日誌。

Architecture:
- 無變更。新增部署機制（Render preDeploy migrate:deploy）屬 ADR-006 部署邊界內；ADR-005 AuditLog append-only DB-層 REVOKE 延至 Phase 7（需 app-role 分離）。

Human Owner:
- NOW：確認 CI `db` job 綠 → Render preDeploy migrate 自動套用 → 跑一次 seed one-off job（`pnpm db:seed`, `SEED_DEMO=true`）→ 回報 → Step 1 acceptance

Next:
- Step 1 acceptance → Step 2（LINE / LIFF 登入骨架，卡 Human Owner LINE 憑證）

### 2026-08-14 — Phase 5 ACCEPTED（Human Owner 驗收通過）

Completed:
- Human Owner 正式驗收 Phase 5：Frontend + Backend API + Worker + Redis + PostgreSQL + CI + Web→API 全數通過
- Phase 5 標記為 ACCEPTED

Next:
- Phase 6 — Vertical Slice（LINE Login → User → Student → 權限 → LIFF Dashboard），於新 session 啟動
- 序列：DB migration + seed → LINE/LIFF 登入骨架 → RBAC 骨架 → 端到端讀取切片

### 2026-08-14 — Phase 5 / Web→API 接通驗證通過

Completed:
- Human Owner 於 Vercel 設 API_INTERNAL_URL=https://sproutin-api.onrender.com + SCHOOL_SLUG=vercel-fallback(標記) + Redeploy
- （Claude 無法操作 Vercel：瀏覽器政策擋 vercel.com；改由 Human Owner 執行，Claude 給步驟 + 驗證）

Verification:
- GET web /api/public-config → schoolSlug="dev"（後端值，非 fallback）→ Web→API 溝通 VERIFIED ✅
- Phase 5 技術項目全數通過；僅剩 Human Owner Acceptance

Issues:
- Problem: claude-in-chrome 無法導航 vercel.com（政策）。Solution: 提供精確步驟由 Human Owner 執行，Claude 負責結果驗證。

Architecture:
- 無變更。

Human Owner:
- NOW：給 Phase 5 正式 Acceptance（技術全綠）

Next:
- Human Acceptance → Phase 5 完成 → Phase 6（Claude 不自行進入）

### 2026-08-14 — Phase 5 / Render 後端部署上線 + 驗證通過

Completed:
- Human Owner 於 Render Apply Blueprint「sproutin」（Claude 以瀏覽器協助導航，Human 綁卡 + 按 Deploy）
- 建立 4 resource（全 Singapore）：sproutin-db、sproutin-redis、sproutin-api(Starter)、sproutin-worker(Starter)；估價 US$14/月
- API Live：https://sproutin-api.onrender.com

Verification（線上，實測）:
- /health → {"status":"ok"} ✅
- /config/public → 正確 PublicConfig，無 secret / 無 API_INTERNAL_URL ✅
- API → PostgreSQL：app 成功啟動（Prisma $connect 成功）✅
- Worker log：ready — connected to Redis；processed job ping；self-test OK ✅
- Render deployment：4 resource 全綠 ✅

Issues:
- Blueprint 需付費（worker Starter 必付費）→ Human Owner 綁卡。Prisma on Alpine 正常（openssl 生效）。

Architecture:
- 無變更（部署位置 ADR-006）。

Human Owner:
- NEXT：於 Vercel 設 API_INTERNAL_URL=https://sproutin-api.onrender.com（Web→API）；給 Phase 5 正式 Acceptance

Next:
- Web→API 佈線 + Human Acceptance → Phase 5 完成 → Phase 6

### 2026-08-14 — Phase 5 / render.yaml TEST/DEV 標記 + 結構性驗證 PASS

Completed:
- `sproutin-redis` / `sproutin-db` 的 `plan: free` 明確標記 **TEST/DEV ONLY，非 production**（render.yaml 註解 + ADR-006）
- 結構性驗證（pyyaml + Render Blueprint schema 檢查）：**PASS，0 error / 0 warning**
  - services: web(sproutin-api) / worker(sproutin-worker) / keyvalue(sproutin-redis)；databases: sproutin-db
  - region 全 singapore；fromDatabase→sproutin-db、fromService→sproutin-redis 交叉引用正確；keyvalue noeviction；web healthCheckPath；worker dockerCommand

Verification:
- YAML 語法 + 結構 schema：PASS（本地）。**注意**：機器無 Render 官方 CLI，最終權威驗證為 Render Apply 前的 Blueprint preview。**未 Apply / Deploy。**

Issues:
- Problem: 無法在本地跑 Render 官方 validator。Solution: 以 pyyaml 解析 + 依 Blueprint 規格逐項檢查 + 交叉引用；並提示以 Render Blueprint preview 做最終確認。

Architecture:
- 無變更。

Human Owner:
- NOW：刪除手動空 DB/Redis → Apply（Render preview 為最終驗證）

Next:
- Apply → 後端線上驗證

### 2026-08-14 — Phase 5 / render.yaml 改為 Blueprint 統一建立全部資源

Completed:
- Human Owner 決定刪除手動建立、無資料的 Postgres/Key Value，改由 Blueprint 統一管理
- `render.yaml` 重寫：建立 4 個 resource（api / worker / keyvalue `noeviction` / postgres），全部 region=singapore；
  api+worker 以 fromDatabase / fromService 自動取得 DATABASE_URL / REDIS_URL（server-only，不暴露 client）
- 文件同步：ADR-006（改為統一管理）、05（步驟）、02、07、08

Verification:
- 無 code 變更（僅 render.yaml + 文件）；CI 不受影響。**未 Apply / Deploy**（依 Human Owner 指示）。

Issues:
- Problem: 上一版為「引用既有資源」；Human Owner 改為由 Blueprint 統一建立。
  Solution: 移除 Environment Group、恢復 databases:/keyvalue: 宣告 + fromDatabase/fromService。
  Trade-off: Human Owner 需先刪除手動空資源；換得單一來源、Apply 即全自動接線。

Architecture:
- 無變更。ADR-006 更新為「Blueprint 統一管理」。

Human Owner:
- NOW：刪除手動空 DB/Redis → 確認 render.yaml → Apply

Next:
- Apply → 後端線上驗證 → Phase 5 acceptance

### 2026-08-14 — Phase 5 / render.yaml 改為引用既有 Render 資源

Completed:
- Human Owner 已手動建立 Postgres + Key Value；為避免重複建立，`render.yaml` 改為：
  只宣告 api + worker，移除 databases: 與 keyvalue:；DATABASE_URL/REDIS_URL 走
  Environment Group `sproutin-backend`（sync:false，Human Owner 後台填既有資源 Internal URL）
- 文件同步：ADR-006（既有資源引用註記）、05（步驟改寫）、02、07、08

Verification:
- 無 code 變更（僅 render.yaml + 文件）；CI 不受影響。**未 Apply / Deploy**（依 Human Owner 指示）。

Issues:
- Problem: 原 render.yaml 宣告 databases/keyvalue → Apply 會重複建立既有資源。
  Cause: Render fromDatabase/fromService 僅能引用同 Blueprint 內資源。
  Solution: 移除資源宣告，改用 Environment Group（sync:false）引用既有資源。
  Trade-off: Human Owner 需於後台填 2 個連線字串一次（安全、無重複）。

Architecture:
- 無變更（仍 API+Worker+Redis+PostgreSQL）。ADR-006 補既有資源引用註記。

Human Owner:
- NOW：設 noeviction、確認 region、Apply（確認後）、填 Environment Group 連線字串

Next:
- 確認 render.yaml → Apply → 後端線上驗證

### 2026-08-14 — Phase 5 / 後端部署決策 + Render 設定（ADR-006）

Completed:
- Human Owner 正式決策 AQ-1/AQ-2 → ADR-006（Vercel: Web｜Render: API+Worker｜Managed Redis｜Managed PostgreSQL）；架構不變
- Frontend Phase 5 = ACCEPTED（Human Owner）
- 部署設定：`render.yaml`（api web service + worker + Key Value + Postgres）
- Docker：Dockerfile.api 加 openssl（Prisma on Alpine）
- 部署必要修正：main.ts 綁 PORT/0.0.0.0；worker.ts 加 Redis 連線 + self-test ping job（非業務邏輯）
- 文件：ADR-006、docs/09 部署位置、05-human-preparation（env 清單 + 部署分工 + PG/Redis 說明）

Verification:
- 待 CI（本次程式變更需 typecheck/build 綠）；後端線上驗證待 Human Owner 於 Render 部署

Issues:
- Problem: Render web service 需綁 $PORT/0.0.0.0；Prisma on Alpine 需 openssl。Solution: main.ts + Dockerfile 修正。

Architecture:
- 無變更（僅定部署位置，ADR-006）。AQ-1/AQ-2 關閉。

Human Owner:
- NOW：建 Render 帳號 + 連 GitHub + Blueprint 部署

Next:
- Render 部署 → 後端線上驗證 → Phase 5 acceptance

### 2026-08-14 — Phase 5 / CI 綠燈

Completed:
- 修正 CI pnpm 版本衝突（移除 workflow 重複的 version，改讀 packageManager）
- CI run 31732797734 全綠：install / db:generate / typecheck / test / build

Verification:
- ✅ 骨架程式碼實際可編譯 / 可建置 / 測試通過（解決先前「未驗證」疑慮）

Issues:
- Problem: 首三次 CI 於 pnpm setup 即失敗（版本重複指定）。Solution: workflow 移除 `version: 9`。

Architecture:
- 無變更。

Human Owner:
- NOW：決定 API+Worker 部署平台（AQ-1+AQ-2）以完成 /health、/config/public 驗證

Next:
- （待決定後）部署 API → 驗證 /health、/config/public → Phase 5 acceptance

### 2026-08-14 — Phase 5 / Vercel Web 上線 + 線上驗證（前端）

Completed:
- apps/web 部署至 Vercel Production：https://sproutin-kb91-theta.vercel.app
- 線上驗證（前端）：Web 首頁載入 ✅、`/api/public-config` 回傳正確 ✅、無 secret/內部 URL 外洩 ✅

Verification:
- VERIFIED（web 三項）；`/health`、`/config/public`（後端 API）仍 PENDING — API 未部署

Issues:
- Problem: Phase 5 Gate 含 /health、/config/public，但那是後端 API 端點，本次僅部署前端。
  → 需先決定 API 部署目標（新增 AQ-2）。

Architecture:
- 新增 AQ-2（API production hosting，與 AQ-1 同類，DEFERRED）。Claude 不自行決定部署架構。

Human Owner:
- NOW：決定 API + Worker 部署平台（AQ-1 + AQ-2）

Next:
- 依決定部署 API → 驗證 /health、/config/public → Phase 5 acceptance

### 2026-08-14 — Phase 5 / Git 上線 + lockfile

Completed:
- git init + 首次 commit + push 至 `github.com/Maderfacar/sproutin`（main）
- 產生並推送 `pnpm-lock.yaml`（供 CI `--frozen-lockfile` 與 Vercel 建置）
- 公開倉庫機密檢查通過（無 .env / 無憑證；僅 .env.example 佔位字）

Verification:
- 尚未：CI 首次執行、Vercel Preview、Online（等 Human Owner 接 Vercel）

Issues:
- Problem: 初始無 lockfile → CI/Vercel 會失敗。Solution: `pnpm install --lockfile-only` 產生並推送。

Architecture:
- 無變更。AQ-1 維持 DEFERRED。

Human Owner:
- NOW：Vercel import repo → Root Directory 設 `apps/web` → Framework = Next.js

Next:
- CI 綠燈 + Vercel Preview + Online 驗證（Phase 5 Acceptance）

### 2026-08-11 — Phase 5 / Project Control & Progress System

Completed:
- 建立 `docs/project/08-development-progress.md`（本文件，持續跟讀導航）
- （前置）建立 `docs/project/00-07` Project Control Documentation
- （前置）Phase 5 skeleton 已 IMPLEMENTED（NestJS/Next.js/Worker/Prisma/Docker/CI/Test、/health、/config/public）

Verification:
- 無新驗證。Phase 5 skeleton 仍 VERIFICATION_PENDING（CI/Preview/Online 未執行）

Issues:
- repository 未初始化 git → Phase 5 Verification 無法開始（soft blocked，待 Human Owner）

Architecture:
- 無新架構決策。AQ-1（Worker hosting）維持 DEFERRED

Human Owner:
- NOW：init git、建 GitHub repo、接 Vercel

Next:
- Phase 5 Verification（等 Human Owner 接線後執行）
```
