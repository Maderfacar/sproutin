# 00 — Project Master（人類總控制台）

> **每日跟讀請先看 → [08-development-progress.md](./08-development-progress.md)**（現在在哪/做什麼/缺什麼/誰要做什麼/下一步）。
> 本文件是一次性總覽（角色/Phase 全貌/Gate）；`08` 是持續更新的進度導航。
> 架構真相在 [../README.md](../README.md) 與 [../adr/](../adr/)；本目錄是**專案控制**（進度/驗收/Release/測試/工作邊界）。

## 1. Sproutin 是什麼
以 **LINE OA + LIFF** 為入口的幼兒園校務管理與家長溝通 **SaaS**。核心資料單位 = **Student**。原則：Student-centered、Single Source of Truth、Event-driven、Config-driven、Backend-authoritative、Modular Monolith、DB-per-School / Single-Tenant Multi-Instance、One Codebase / Multiple Instances。

## 2. 三方角色
| 角色 | 誰 | 職責 |
|------|----|------|
| **Human Owner** | 你 | 最終決策、驗收（Acceptance）、準備帳號/secret/demo data、批准 Release |
| **ChatGPT — Architecture / Product Reviewer** | 架構/產品審查 | 架構決策審查、Gate 把關、回答架構問題 |
| **Claude — Implementation Agent** | 實作代理 | implementation / refactor / test / migration / 文件 / 提出架構問題（**不得自行驗收或改架構**） |

## 3. Phase 總覽（Project Control Classification，見 [01-project-map](./01-project-map.md)）
`0 產品定義 · 1 技術棧 · 2 架構 · 3 Domain/DB/RBAC/Event/API · 4 Architecture Gate · **5 Project Skeleton** · 6 Vertical Slice · 7 Core MVP · 8 Integration/Hardening · 9 Pilot · 10 Production · 11+ Future`

## 4. 目前在哪
```text
Current Phase:
Phase 7 — Core MVP（進行中）。Phase 6 — Vertical Slice = ✅ COMPLETE（2026-08-14, Human Owner）。

Current Status:
Phase 7 進行中（前端排法 = 後端優先，主題/色彩/園方設定於 Step 7）。
- Step 1 Leave 狀態機 + Step 2 Attendance → ✅ ACCEPTED（2026-08-15, Human Owner）。
  CI 綠（run 31840973966）;Render 線上 `/leaves`、`/attendance` 回 401;API 級 e2e（真實 JWT）覆蓋帶登入流程。
- Step 3 — Event 串接（Outbox → Worker dispatch）→ ✅ **ACCEPTED**（2026-08-15, Human Owner;含 docker-build job 清 tech debt）。
- Step 4 — Message / Announcement / Notification（站內讀取端）→ ✅ **ACCEPTED**（2026-08-15, Human Owner;CI 綠 + 線上三路由 401）。
- Step 5 — Notification / LINE Push → **IMPLEMENTED**（2026-08-15;只推重點事件、best-effort+重試）。線上驗卡 Human Owner 填 Messaging token + LINE 好友/provider。
- Step 6 — Audit out-of-band durable path + 稽核查詢端點 → ✅ **ACCEPTED**（2026-08-16, Human Owner;CI run 31904698836 綠 + Render 線上 `/audit-logs` 401 + CI e2e 覆蓋帶 token 流程;DENIED/FAILURE/敏感 READ → durable `audit` 佇列 + DLQ、Worker 寫入;不動基礎設施）。append-only DB 層鎖死（決策 2）拆下一版。
- Step 7 — Dashboard·Branding·Feature Flag（前端可操作頁面,切子步驟先家長→老師→園長）→ **IN_PROGRESS**。
  - 7a 前端地基（Tailwind + TanStack Query + runtime 品牌）+ 家長「請假」端到端 → **已上線待驗收**（2026-08-16;CI run 31913609567 綠 + Production 路由 200/401;待 Human 手機實測）。UI/資料抓取新 library 經 §D 核准;多重身份採聯集視圖。
  - 7b 家長其餘四張卡片（出缺勤/訊息/通知/公告）→ **IMPLEMENTED**（2026-08-16;本機 typecheck/test[133]/build 綠;待 push→CI + Vercel + Human 手機實測）。
- 下一步：7a/7b 手機實測 acceptance → 7c（老師端:審核請假/點名/班級訊息·公告）。平行未了:append-only 鎖死（下一版 §D）、Step 5 LINE 推播線上實測前置。（Phase 6 全數 ACCEPTED。）
```

## 5. 已完成什麼（Phase 0–4 通過；Phase 5 已實作）
- Phase 0–4：產品定義、技術棧、架構 v1.1、Domain/DB/RBAC/Event/API、Architecture Gate + 5 份 ADR — **通過**。
- Phase 5（已建立、**未驗收**）：Monorepo、NestJS skeleton、Next.js skeleton、Prisma schema baseline、Worker entrypoint、Docker baseline、CI baseline、Test baseline、`/health`、`/config/public`、server-only runtime config。零 feature。

## 6. 尚未完成什麼
- Phase 5 的 **compile / runtime / CI / Preview 驗證**（尚未執行）。
- ESLint flat config（Technical Debt）。
- git 尚未初始化、尚未 commit / push；尚無 CI 執行、尚無 Vercel Preview。
- Phase 6 以後（Vertical Slice、Core MVP…）**尚未開始**。

## 7. 目前 Blocker
- 無硬性 Blocker；但 Phase 5 **驗收未完成**，未驗收前不進 Phase 6。
- 驗證依賴 Human Owner 準備 GitHub repo + CI/Vercel 連線（見 [05-human-preparation](./05-human-preparation.md)）。

## 8. 目前需要 Human Owner 決定什麼
1. **git / GitHub / Vercel / CI 接線**：初始化 repo、首次 commit、接 Vercel。
2. **Architecture Question — Worker/BullMQ 的 Production hosting**（Vercel serverless 無法託管長駐 Worker）→ 見 §10 與 [07-current-status](./07-current-status.md) Architecture Questions。等 Architecture Review。
3. 準備 LINE Developers / OA、PostgreSQL / Redis provider（見 [05](./05-human-preparation.md)）。

## 9. 下一步
```text
Phase 5 驗收：Push → CI 綠燈 → Vercel Preview → Online 驗證(/health, /config/public, web) → Human Acceptance
（通過後才進 Phase 6 — Vertical Slice）
```
Claude **不自行**進入下一 Phase，等 Human Owner 指令。

## 10. 最新 Release / Gate 狀態
| 項目 | 狀態 |
|------|------|
| Architecture Gate (v1.1) | ✅ Passed |
| **Phase 5（整體）** | ✅ **ACCEPTED**（2026-08-14, Human Owner）— 前端+後端+Worker+Redis+PG+CI+Web→API 全綠 |
| Live URLs | Web: sproutin-kb91-theta.vercel.app ｜ API: sproutin-api.onrender.com |
| Next | Phase 6 — Vertical Slice（新 session 啟動） |
| CI | ✅ green（run 31732797734） |
| Vercel（web） | ✅ Ready — https://sproutin-kb91-theta.vercel.app |
| 部署決策 | ✅ ADR-006（Vercel + Render） |
| Last Accepted Release | None（R1 前端部分驗收） |

### Architecture Question（摘要）
AQ-1/AQ-2（部署位置）已定案 → **ADR-006**（Vercel: Web｜Render: API+Worker｜Managed Redis｜Managed PostgreSQL），架構不變。目前**無待決** Architecture Question。
