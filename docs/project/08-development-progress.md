# Sproutin Development Progress

> **這份是 Human Owner 的主要「持續跟讀」文件。** 只回答：現在在哪裡？完成什麼？還缺什麼？誰要做什麼？下一步是什麼？
> 它是**導航**，不是 Source of Truth。真正的真相在：Architecture → `docs/00-09` + `docs/adr/`；Project Control → `docs/project/`。
> Last updated: 2026-08-19（**時間改用台灣時區 + 後台也有字體放大 ✅ ACCEPTED**（Human Owner「驗收過關」）——
> Human Owner 回報「系統的時間與台灣時間不符」：① 全站的「今天」原本是 UTC 的今天，
> 台灣凌晨 0–8 點會整個差一天（老師七點到園就中招）② 稽核／對話的時間戳直接印 UTC，慢 8 小時。
> 前端新增 lib/datetime.ts、後端新增 todayKey()，**儲存慣例不變**。無 migration、無新端點。
> 測試 553 → **574**。後台左欄下方加上字體大小（精簡版，與家長端同一個元件）。
>
> （前次）2026-08-19（**打磨第二階段下一輪：後台 8 頁斷句 ✅ ACCEPTED**（Human Owner「已驗收」）——
> 人員／權限／班級／學生管理／園所外觀／發送訊息／娃娃車設定／稽核紀錄。
> 後台**不貼身分籤**（整頁都是校方的東西，每段掛一次只是噪音）。
> 無 migration、無新端點。測試 545 → **553**。B3（底部四格自訂）Human Owner 定案先不做。
>
> （前次）2026-08-18（**打磨第二階段 6 頁全數 ✅ ACCEPTED**（Human Owner「驗收過」）——
> 版面斷句 + 多重身分標示。三題由 Human Owner 定案（區塊元件／只給多重身分看／六頁）。
> 聯絡簿（範本頁）+ 娃娃車 / 出缺勤 / 請假 / 公告 / 學生整合視圖 5 頁都套上 Band。
> 無 migration、無新端點。測試 522 → **545**。**下一輪：約 8 個「只缺斷句」的管理頁。**
>
> （前次）2026-08-18（**B1 手機體感前三件 + B2 訊息中心 IMPLEMENTED，待線上驗收**;插隊三件 A1–A3 已 ✅ ACCEPTED。
>
> （前次）2026-08-18（**插隊三件 A1–A3**——
> A1 全站字體大小（標準／中／大，存在這支瀏覽器上、只在家長端「我的」提供開關）、
> A2 最新公告移到「快速功能」上方、A3 首頁封面圖延伸到頁首後面且頁首改為固定在最上方。
> 無 migration、無新端點。測試 445 → **464**。四題由 Human Owner 定案（見下方）。
>
> （同日）**功能對等 批2 與 批3 ✅ ACCEPTED**（Human Owner 口頭確認「兩個都看過了，沒問題」）。
>
> （前次）2026-08-18（**打磨第一批 IMPLEMENTED，待線上驗收**——七項：載入畫面的空白、
> 自己的「找不到頁面」、分頁標題與小圖示、圖文選單可指到娃娃車（只給老師）、
> 稽核紀錄顯示操作者姓名、寬螢幕雙欄（出缺勤／請假／公告）、清掉沒人用的 `onlyMobile`。
> 無 migration、無新端點。測試 428 → **445**。範圍由 Human Owner 四題定案。
>
> （前次）2026-08-18（**親師對話多了發話者標示 ✅ ACCEPTED**——泡泡上顯示「陳美玲 · 母親」；
> `/messages` 原本連名字都沒回，只有一串 ID。無 migration、無新端點。
> 對話圖片經 Human Owner 定案**先不做**（需私有儲存 + 簽名網址）。測試 428。
>
> （同日）**電腦版／手機版功能對等全數補齊**——批1 ✅ ACCEPTED，批2＋批3 待線上驗收。
> 批1＝學生整合視圖／學生管理／班級管理補桌面版，**桌面的娃娃車設定流程接回來了**，
> 並新增 `lib/surface.ts` 讓共用元件裡的連結依外框自動翻譯。
> 批2＝權限設定與發送訊息補手機版、稽核紀錄補桌面版，`/liff/me` 補上入口。
> 批3＝聯絡簿／出缺勤／請假／公告／娃娃車點名／通知補桌面版，導覽的「手機版」標籤全數消失。
> 四項全綠、測試 412 → **425**。三類明文例外見 docs/04 §3b。**下一步：打磨。**）
>
> （前次）2026-08-18（**⑦ 娃娃車刀1 IMPLEMENTED，待線上驗收**——migration 0009、`/bus/*` 與 `/me/bus`
> 端點、後台設定頁（**電腦＋手機兩邊都有**）、隨車老師點名、家長今日狀態、請假自動移出名單。
> Human Owner 更正「站點」→**接送點**（door-to-door）。**新增永久原則：電腦版與手機版功能必須相通**（docs/04 §3b）。
> 順帶修好 CI 自 cc9f04f 起的紅燈（根路徑 `useBranding` 在沒有 provider 之下丟例外，`next build` 失敗）。
> 下一步：補齊電腦／手機不對等的頁面 → 再打磨。）
>
> （前次）2026-08-17（**Flex Message 群發 IMPLEMENTED，待線上驗收**——`/admin/messages` 版型填空 + 收件範圍 + 送出前顯示則數 + 兩段式送出 + 送出紀錄；公告推播同步升級為卡片；migration 0008。§D 三題已定案：核准、按鈕可連外部網址、繳費提醒版型保留。下一步 ⑤ 打磨。）

---

## Current Position

**Phase:**
**Phase 9 — Demo（銷售用 demo，非 pilot）／階段2「後台管理 + 園所裝飾」進行中。** Phase 5–8 皆 COMPLETE。
階段2 分 5 刀：**刀 1（園所外觀設定頁 + 功能藍圖佔位卡）＝ ✅ ACCEPTED（2026-08-17）**；**刀 2（班級 + 學生管理）＝ ✅ ACCEPTED（2026-08-17）**；**刀 3（人員帳號與關聯，含 migration 0004）＝ ✅ ACCEPTED**；
**刀 5＝ ✅ ACCEPTED**（學生整合視圖 + 公告 LINE 推播;推播根因＝單一無效收件人中斷整批，已修復並複測收到）。
**刀 4（每日聯絡簿）＝ ✅ ACCEPTED（2026-08-17, Human Owner 線上驗證完畢）** —— 五刀中最大的一刀：migration 0005、
6 個新端點、老師「直欄模式」填寫端、家長閱讀端，並依 Human Owner 決策 **把「訊息」併入聯絡簿**（入口收斂）。設計定案見 Recent Work Log。

# ✅ **Phase 9 階段2「後台管理 + 園所裝飾」五刀全數 ACCEPTED（2026-08-17）** —— 階段2 完成。
（歷史：**Phase 7 — Core MVP ✅ COMPLETE（2026-08-16, Human Owner）**；Phase 8 主體完成、#6 定案 B 延後。）

**Milestone:**
Phase 7 Step 1–7 全數 ✅ **ACCEPTED**。Step 5 LINE 推播已**線上實測收到**（帶學生姓名）;Step 7（7a–7d）前端可操作頁面 + 品牌 + Feature Flag + 稽核頁全部上線並手機實測通過。

**Status:**
```text
Phase 5:  ✅ ACCEPTED（2026-08-14）
Phase 6:  ✅ COMPLETE（2026-08-14, Human Owner）— Step 1–4 全數 ACCEPTED
Phase 7:  ✅ COMPLETE（2026-08-16, Human Owner）— Core MVP 全數 ACCEPTED
  Step 1 Leave 狀態機                                          → ✅ ACCEPTED
  Step 2 Attendance（手動 SoT + ADR-002 override）             → ✅ ACCEPTED
  Step 3 Event 串接（Outbox → Worker dispatch）               → ✅ ACCEPTED
  Step 4 Message / Announcement / Notification（站內讀取端）    → ✅ ACCEPTED
  Step 5 Notification / LINE Push                              → ✅ ACCEPTED（線上實測收到推播,帶學生姓名）
  Step 6 Audit out-of-band durable path + 稽核查詢端點          → ✅ ACCEPTED
    └ append-only DB 層鎖死（決策 2）→ 留 Phase 8（§D 提案）
  Step 7 Dashboard / Branding / Feature Flag（前端可操作頁面）   → ✅ ACCEPTED
    ├ 7a 前端地基 + 家長「請假」端到端                          → ✅ ACCEPTED
    ├ 7b 家長其餘卡片（出缺勤/訊息/通知/公告）                 → ✅ ACCEPTED
    ├ 7c 老師端（審核/點名/班級訊息·公告）+ GET /classes、GET /leaves?classId= → ✅ ACCEPTED
    └ 7d 園長·ADMIN（稽核查詢頁 + 全校公告 + 全校待審總覽）+ GET /leaves 全校 → ✅ ACCEPTED
Phase 8:  IN_PROGRESS（Integration / Hardening;順序由 Claude 排,Human Owner 授權「都做」）
  1. ESLint flat config（CI lint gate）                        → ✅ 上線（CI 綠 run 31941929773）
  2. 全域 exception filter（統一錯誤信封,不洩漏內部）           → ✅ 上線（CI 綠 run 31942307892）
  3. web 元件測試（vitest + RTL;web 8 tests）                  → ✅ 上線（CI 綠 run 31942641153）
  4. hardening（web 安全標頭 + 錯誤/隔離/secret 檢視）          → ✅ 上線（CI 綠 + 線上標頭生效;CSP/rate-limit 列後續）
  5. P5 demo 資料收尾（園長 ADMIN+監護 fixture 改 opt-in）      → ✅ 上線（CI 綠 run 31943015872）
  6. append-only DB 層鎖死（least-privilege app role）          → **DEFERRED（Human Owner 定案 B,2026-08-16）**;A 排正式上線前（Technical Debt）
Phase 9:  NOT_STARTED（Pilot）— 下一步
```

> **Phase 8 #6 已定案 B（2026-08-16, Human Owner）**：AuditLog append-only 已由 trigger 於 DB 層強制（migration 0002）足夠 dev/pilot。least-privilege app role（A:AuditLog 只授 INSERT/SELECT + 新 secret `APP_DATABASE_URL` + 換連線,防「app 憑證外洩→卸 trigger 竄改」殘餘風險）**延後,排正式上線前執行**（見 Technical Debt;屆時 Claude 主動提醒）。
```

> Step 7 設計決策（Human Owner 拍板 2026-08-16）：範圍=一次一角色（家長→老師→園長）;UI=Tailwind+少量自建元件（§D 核准）;資料抓取=TanStack Query（§D 核准）;品牌=顏色+logo+banner;版型風格模板留 Phase 8（§D）。多重身份（同帳號兼多角色）架構本就支援（UserRole[] 多筆 + Guardianship + docs/05 §5），前端採聯集視圖。

---

## Current Objective

**Phase 7 — Core MVP ✅ COMPLETE。Phase 8 — Integration / Hardening 主體完成（2026-08-16）。**
Phase 8 已上線：#1 ESLint flat config + CI lint gate、#2 全域 exception filter（統一錯誤信封）、#3 web 元件測試（Vitest+RTL）、#4 安全標頭 + 隔離/secret/錯誤檢視、#5 P5 demo 資料收尾（opt-in）。
**#6 append-only 最小權限 app role → Human Owner 定案 B（延後）**：trigger 已足夠 dev/pilot;A（least-privilege role + 新 secret）**排入正式上線前**（見 Technical Debt）。
**下一步**：Phase 9 — Pilot（多為 infra/ops + Human Owner 前置,非純 code;需先計畫 → 確認）。

---

## Current Task

**Phase 9 階段3 ① 骨架 + ②b 權限設定 + ② 管理首頁 + ④ 園所外觀設計（含 LINE 圖文選單套用）— 全數 ✅ ACCEPTED（2026-08-17）。**
**③ CSV 批次匯入由 Human Owner 暫停**（欄位需等功能完善才明確）。

**⑦ 娃娃車 / 接送 刀1 — IMPLEMENTED / VERIFICATION_PENDING（2026-08-18）。**
四項全綠：lint / typecheck / **測試 412（api 338 + shared 12 + web 62）** / build。migration **0009_bus**（expand-only）。
Human Owner 更正：door-to-door →「站點」改稱**接送點**（`BusPoint`）。

**下一步（Human Owner 2026-08-18 指定）：① 補齊電腦版與手機版的功能對等 → ② 打磨。**
新原則見 docs/04 §3b；待補清單見下方 Recent Work Log。

**功能對等 批1（學生整合視圖 + 學生管理 + 班級管理）— ✅ ACCEPTED（2026-08-18, Human Owner）。**
桌面的娃娃車設定流程（排路線 → 指派每個孩子的接送點）已接回來。
Human Owner 兩題定案：家長維持只能用手機；首頁與「我的」列為對等原則的明文例外（docs/04 §3b）。

**功能對等 批2（權限設定 + 發送訊息 + 稽核紀錄）— ✅ ACCEPTED（2026-08-18, Human Owner）。**
**功能對等 批3（聯絡簿／出缺勤／請假／公告／娃娃車點名／通知）— ✅ ACCEPTED（2026-08-18, Human Owner）。**
四項全綠：lint / typecheck / **測試 425（api 338 + shared 12 + web 75）** / build。**無 migration、無新後端端點。**

✅ **電腦版與手機版功能對等已全數補齊**（三類明文例外見 docs/04 §3b 的對照表）。

**親師對話標出發話者 — ✅ ACCEPTED（2026-08-18, Human Owner）。**
四項全綠：lint / typecheck / **測試 428（api 341 + shared 12 + web 75）** / build。
**無 migration、無新端點**（改既有 `/messages` 的回應）。詳見 docs/07「親師對話的發話者」。
Human Owner 定案：顯示「名字 + 身分」；**對話圖片先不做**（需私有儲存 + 簽名網址，屆時另提 §D）。

**② 打磨 第一批 — IMPLEMENTED / VERIFICATION_PENDING（2026-08-18）。**
四項全綠：lint / typecheck / **測試 445（api 346 + shared 12 + web 87）** / build。
**無 migration、無新後端端點**（改既有 `/audit-logs` 與 `/rich-menus` 的行為）。

範圍由 Human Owner 走查後四題定案：① A 組四項全做 ② 稽核顯示「姓名 + 身分」
③ 圖文選單的娃娃車那一格**只給老師**（家長首頁本來就有卡片，不另做家長版頁面）
④ `onlyMobile` 欄位**刪掉**。

```text
A1 載入／沒權限畫面在桌面外框裡撐出一整個螢幕高的空白   → StatusScreen 加 fullScreen（預設 false）
   順帶修好巢狀 <main>（外框已經有一個，HTML 不合法）
A2 打錯網址跳出系統預設的英文 404                       → app/not-found.tsx（清葉版，給得出下一步）
A3 分頁永遠寫「Sproutin」、沒有分頁小圖示               → lib/pageTitle + components/DocumentTitle + app/icon.svg
A4 圖文選單不能指到娃娃車                               → TARGET_PATHS 加 bus；STAFF_ONLY_TARGETS 後端再擋一次
B1 桌面每日類頁面在寬螢幕上只用左半邊                   → components/SplitColumns（出缺勤／請假／公告）
B2 稽核紀錄的「操作者」是一串看不懂的 ID                → /audit-logs 多回 actorName；另加「只看這個人」
B3 lib/adminNav.ts 的 onlyMobile 沒有任何一條在用       → 刪除（含 AdminShell 的「手機版」標籤與那條測試）
```

**插隊三件（A1 字體大小 / A2 公告位置 / A3 頁首與封面圖）— ✅ ACCEPTED（2026-08-18, Human Owner 線上驗證完畢）。**
四項全綠：lint / typecheck / **測試 464（api 346 + shared 12 + web 106）** / build。
**無 migration、無新後端端點**（純前端）。

Human Owner 四題定案：① 字體大小**存在這支瀏覽器上**（localStorage，不進資料庫）
② 開關**只給家長的手機**（放 `/liff/me`） ③ A3 **直接做**，不必先畫圖 ④ 批2／批3 驗收通過。

```text
A1 全站字體大小 標準 / 中 / 大        → lib/fontScale.ts + components/FontScaleControl.tsx
   100% / 112.5% / 125%，改的是 html 的 font-size。Tailwind 字級與間距都是 rem，
   所以整頁等比放大，卡片、留白、圖示、行高一起長大 —— 版面比例不會跑掉。
   用 % 不用 px：已在系統設定裡放大過字的人不會被壓回 16px。
   首次繪製前就套（root layout 內嵌開機腳本），不會先閃一下小字。
   存不進去（無痕模式）時**明講「重開會回到標準」**，不假裝記住了。
A1' 放大後才會現形的三處破版（先掃出來才動手，不是事後補）：
   · 全站 19 處寫死的 px 字級（text-[10px] 等）不會跟著放大 → tailwind 補 2xs/3xs/4xs
     三級（rem），全部換掉。LINE 卡片預覽的外框寬高也一併改 rem，否則字大了框沒大。
   · 首頁「快速功能」：icon + 4 字標題 + 「即將推出」在 375px 手機上搶不到同一行，
     標題會被折成「收費繳／費」→ 徽章改放標題底下，與寬度脫鉤。
   · 稽核列：動作代碼 + 結果 + 時間三個搶一行 → 改 flex-wrap，讓時間整段掉下一行。
   · 另外把頁首園名加上 truncate（長園名會把通知鈴擠出畫面）、
     後台側欄 232px → 14.5rem（字放大時 whitespace-nowrap 會撐爆側欄）。
A2 最新公告移到「快速功能」之上   → 公告是「今天有沒有新的事」，快速功能是常駐入口；
   會變的東西要先看到。rise-in 的 animationDelay 一起對調。
A3 封面圖延伸到頁首後面           → AppShell 頁首改 sticky top-0；在 `/liff` 最頂端時
   透明疊在圖上（白字、看不見的底線），往下捲 8px 換回實色底 + backdrop-blur。
   **只有 `/liff` 有 hero**，其他頁一進來就是實色。
   hero 靠 globals.css 的 --shell-header-h 往上鑽（唯一量測值來源），並把同樣高度長回來
   —— 頁首下方看得到的 hero 與其下所有內容位置與改動前完全相同，只是圖多延伸到頁首後面。
   底線兩種狀態都保留（透明時看不見），否則捲動時頁首矮 1px、整頁會跳。
   hero 頂端加一層暗紗：封面圖是園所自己傳的，可能上半部很亮；品牌色也可能挑到淺色。
```

**打磨第二階段 —— 版面斷句 + 多重身分標示（Band 元件 + 6 頁）
— ✅ ACCEPTED（2026-08-18, Human Owner 線上驗證完畢）。**
四項全綠：lint / typecheck / **測試 545（api 362 + shared 12 + web 171）** / build。
無 migration、無新後端端點（純前端）。

Human Owner 走查提出兩個症狀：① 一頁把功能區塊全排在一起「像一篇沒有標點符號的文章」
② 多重身分的人分不出哪一段是給哪個身分看的。全站盤點結果：**6 頁有身分分歧、
約 8 頁只缺斷句、4 頁不用改**。

三題定案：① 加全站共用的「區塊」元件 ② 身分籤**只有多重身分的人看得到**
③ 這一輪做元件 + 6 個有身分分歧的頁。

```text
元件    components/Band（kind=action/review/manage + title + description + audience）
        roleFlags 新增 hasDualIdentity（校方 ∧ 家長）—— 仍是唯一的顯示判斷來源
聯絡簿  範本頁：老師的記錄區在上（粗線 + 以老師身分）、翻閱區在下（細線收斂）
娃娃車  點名（以老師身分）→ 查看單一學生 → 娃娃車設定（manage，排最後，偶爾才動一次）
出缺勤  點名（以老師身分）｜查看單一學生 —— Band 放在 SplitColumns 的兩欄各自裡面
請假    待審核（以老師身分；全校或班級）｜申請請假 → 請假紀錄（選到學生才長出來）
公告    發一則公告（以老師身分）｜公告列表；說明會依「能不能發全校」換句話
學生視圖 孩子的名字留成頁面標題（不進 Band）；本月出缺勤／家長／最近請假是翻閱，
        娃娃車是唯一動得了東西的一段（manage + 以老師身分，只有園長／行政看得到）
順帶    面板進 Band 之後拿掉自己那顆 <h2 className="section-title">（同一段不會有兩個標題）：
        點名（老師）／發公告／待審核請假（老師）／全校待審請假
測試    web 148 → 171（5 支新的 view spec：哪幾段出現、誰排前面、身分籤貼在哪裡）
下一輪  約 8 個「只缺斷句」的管理頁（人員/權限/班級/學生管理/園所外觀/發送訊息/娃娃車設定）
```

**做的過程中發現、需要 Human Owner 知道的一件事**：身分籤只能貼在**結構上必然**的區塊。
聯絡簿的「翻閱單一學生」清單裡同時有老師帶的班級與他自己的小孩，而 session 的 `AuthUser`
**沒有帶 `guardianOf`** —— 前端判斷不出選到的是不是自己的小孩。所以那一區改用文案講清楚，
不貼可能貼錯一半的籤。要貼得準必須讓 `/me` 多回監護關係，那是後端改動（§D 提案，尚未提）。
這一輪的 5 頁沿用同一條規則：**只有校方獨有的區塊才貼籤**（點名／審核／發布／娃娃車設定），
凡是「選一個學生來看」的清單一律不貼，改用文案講清楚（例如「你帶的班級和你自己的小孩都在這個清單裡」）。

**B1 手機體感 前三件 — IMPLEMENTED / VERIFICATION_PENDING（2026-08-18）。**
四項全綠：lint / typecheck / **測試 509（api 362 + shared 12 + web 135）** / build。
**無 migration、無新後端端點**（純前端）。Human Owner 定案：只做前三件，PWA 不做。

```text
① 骨架屏取代「載入中…」   components/Skeleton（Rows / Cards / Lines 三種形狀）
   全站 27 個檔案的載入文字全部換掉。形狀要像「等一下真的會出現的東西」，
   否則資料到位時會整頁跳動 —— 所以是逐處配形狀，不是全部套同一個。
   例外：/liff/message 的「訊息已併入聯絡簿，正在前往…」保留 StatusScreen
   （那是轉址提示，不是在等資料）。
② 按下去立刻有反應       .tappable（active 縮放 + 淡化）用在底部頁籤、首頁快速功能、
   公告與聯絡簿卡片、訊息中心每一列;.btn-primary/.btn-secondary 的 active 加重。
   親師對話：按下送出那一刻先畫出「送出中…」的泡泡，不等伺服器回來;
   送不出去時明講並把字留在輸入框（不安靜吞掉）。
   訊息中心的已讀是樂觀更新（小圓點立刻消失，失敗自動復原）。
③ 換頁的方向感           components/PageTransition，進去從右滑進、返回從左滑回。
   靠 popstate 分辨前進/返回;判斷不出來一律當前進（猜錯只是方向反了，不會壞）。
   位移只有 14px —— 方向講清楚就好，滑太多會讓每次點擊都變慢。
全部尊重 prefers-reduced-motion（與既有 .rise-in 同一個慣例）。
```

**刻意沒做的**：① PWA／加到主畫面（Human Owner 定案不做）② 下拉重新整理、頁籤微震動、
數字補間（列為「可有可無」，未排入）③ 請假送出目前是按鈕轉「送出中…」，**沒有**在請假清單
上先長出一列 pending —— 伺服器才知道那筆的 id 與審核狀態，塞假資料進清單得多一套復原邏輯;
若 Human Owner 要，可另排。

**時間改用台灣時區 + 後台字體放大 — ✅ ACCEPTED（2026-08-19, Human Owner 線上驗證完畢）。**
四項全綠：lint / typecheck / **測試 574（api 366 + shared 12 + web 196）** / build。
**無 migration、無新後端端點**（改的是既有 service 裡「今天是哪一天」的算法 + 前端顯示）。

Human Owner 回報：「系統的時間與台灣時間不符」。查出兩個病灶：

```text
① 「今天」= new Date().toISOString().slice(0,10) → 那是 UTC 的今天。
   台灣 UTC+8，凌晨 0 點到早上 8 點之間，系統認定的今天是**昨天**。
   老師七點到園點名、填聯絡簿正好落在這個區間 ——
   後端「不能填未來」的檢查會把台灣的今天當成明天而擋下來（真的會擋，不是理論）。
② 時間戳直接切 ISO 字串（createdAt.slice(11,16)）→ 印的是 UTC 時鐘，畫面慢 8 小時。
   稽核紀錄、親師對話、群發紀錄、圖文選單套用時間都中招。
```

作法：**時間一律以園所所在時區（Asia/Taipei）呈現，不看使用者裝置的時區**
—— 孩子的「今天」是園所的今天，家長出國時看到的也該是園所的日子。

```text
新增  apps/web/src/lib/datetime.ts —— schoolToday / schoolMonth / schoolHour /
      formatDate / formatTime / formatDateTime / formatMonthDay / isSameSchoolDay /
      schoolDayKeyIso。新程式碼不要再寫 toISOString().slice()、getHours()、toLocaleString()。
新增  apps/api/src/events/day-key.ts 的 todayKey()（台灣的今天 → UTC 午夜 key）,
      用在聯絡簿的填寫窗檢查與娃娃車「今日狀態」的預設日期。
改到  首頁問候語與今天、出缺勤點名日期、請假可選最早日期、娃娃車點名日期與上下車時間、
      聯絡簿老師端日期與到校時間、家長端的「今天」、親師對話的日期分隔與泡泡時間、
      收件匣的相對時間、稽核紀錄、群發紀錄、圖文選單套用時間、學生整合視圖的本月與日期。
不動  **儲存慣例**：日期型欄位仍是「該日曆日的 UTC 午夜」。動 dayKey() 的正規化會改到
      既有資料的語意，那是另一件事（docs/04 已寫明）。
順帶  既有的 relativeTime 測試原本依賴跑測試那台機器的時區（CI 是 UTC、開發機是台灣），
      改成一律寫死 +08:00。
測試  web 179 → 196、api 362 → 366。
```

**後台字體放大**：`FontScaleControl` 加 `compact` 版，掛在 AdminShell 左欄下方（登出上面）。
放大的效果與家長端完全一樣（改 html 的 font-size，全站等比放大）——
差別只有後台欄寬 14.5rem 塞不下每個選項的說明，所以只留三顆按鈕。
**窄視窗時左欄會收成上方橫向導覽，這一塊跟「登出」一樣會收起來**（沿用既有版型，沒有另做）。

**打磨第二階段 下一輪 —— 後台 8 頁的斷句 — ✅ ACCEPTED（2026-08-19, Human Owner「已驗收」）。**
四項全綠：lint / typecheck / **測試 553（api 362 + shared 12 + web 179）** / build。
**無 migration、無新後端端點**（純前端）。

```text
人員管理    新增人員（manage）→ 目前的人員（review）
權限設定    誰有什麼身分（review）—— 原本那張表連個標題都沒有
班級管理    新增班級（manage）→ 目前的班級（review）;班級數改成一行小字
學生管理    新增學生（manage，沒有班級時的引導也收在同一段）→ 目前的學生（review）
園所外觀    LINE 圖文選單 / 園所識別 / 功能卡片 / 請假流程，四段各自一個 manage
發送訊息    做一張卡片發出去（action，「送出後收不回來」留在按鈕旁邊）→ 送出紀錄（review）
娃娃車設定  新增路線（manage）→ 目前的路線（review）
稽核紀錄    查詢條件（action）→ 查詢結果（review）
順帶        面板原本自己那顆 section-title / eyebrow 一律拿掉（同一段不會有兩個標題）
測試        web 171 → 179（班級管理、發送訊息兩支新的 spec）
```

**後台不貼身分籤**（這一輪的判斷，已寫進 docs/04 §3b）：那些頁整頁都只有校方進得來，
每一段都掛一次「以老師身分」只是噪音。身分籤要解決的是「同一頁上同時有我要做的事
與我孩子的狀況」——後台沒有這個問題。

**B3（底部四格工具列可不可以由園所自訂）— Human Owner 定案「先不做」（2026-08-18）。**
先前掛著等他回覆，2026-08-18 已回：**先不做**。查證過的結論留著，之後要做不必重查：
① 那四格寫死在 `AppShell.tsx` 的 `TABS`；② 可挑的目的地與 LINE 圖文選單同一份清單，
**娃娃車不能給家長挑**（那頁是隨車老師點名用的，家長按下去撞權限牆），家長可挑七個：
首頁／聯絡簿／出缺勤／請假／公告／訊息／我的；③ 若要做成「園所統一決定」需要
SchoolConfig **加一個欄位**（expand-only migration）+ `/school/config` 與 `/config/public`
各多回一個欄位，**沒有新端點**；做成「每個家長自己挑」則是純前端，但那就不是園所客製。

**B2 訊息中心（「通知」頁升級）— IMPLEMENTED / VERIFICATION_PENDING（2026-08-18）。**
四項全綠：lint / typecheck / **測試 504（api 362 + shared 12 + web 130）** / build。
**無 migration、無新後端端點**（改既有 `GET /notifications` 的回應，詳見 docs/07 §4j）。

Human Owner 定案：**不做四合一，把通知頁做成訊息中心**（收件匣 + 深層頁面）。

```text
後端  GET /notifications 多回 title / subtitle   讀取時 join，不寫回 payload
      一種資源查一次（studentId/announcementId/messageId/senderId 去重後各一發）
      補不出來退回分類名稱，不回空字串
前端  features/notification/target.ts            type+payload → 手機版網址（後端不管路由）
      NotificationList 改寫成收件匣               圖示 + 標題 + 來源 + 相對時間 + 未讀點
      點一則＝標已讀（樂觀更新）再跳頁
      載入用骨架屏、空狀態給得出下一步、取不到資料明講錯誤（不回空收件匣）
命名  「通知」→「訊息中心」（網址 /liff/notification 不動，圖文選單與既有連結不受影響）
刻意不收進來：出缺勤與行事曆（是紀錄不是訊息，推了會天天洗版）；請假申請與表單（是動作）
```

**待線上驗收的重點面**：底部四格工具列、hero 上疊的白字與園名、首頁快速功能兩欄格線、
聯絡簿直欄模式、稽核列、桌面雙欄（SplitColumns）—— 三種字級各看一次。

**下一步：等 Human Owner 線上驗收，再排打磨第二批**（走查時留下但這一輪沒做的，見 Recent Work Log）。

**Flex Message 群發 — IMPLEMENTED / VERIFICATION_PENDING（2026-08-17）。**
四項全綠：lint / typecheck / **測試 364（api 297 + shared 12 + web 55）** / build。migration **0008_push_campaign**（expand-only；已用 `prisma migrate diff --from-empty` 逐行核對與 schema 一致）。
**§D 三題 Human Owner 定案**：① 提案核准（新 model + 三支端點）② 按鈕**可連外部網址**（我建議只給 App 內頁，他選外部 → 後端限 `https://`，前端明講風險由園所自負）③ **繳費提醒版型保留**（「不假裝自己是收費系統，就是提醒；欄位標籤寫清楚是顯示用文字」）。
下一步 ⑤ 打磨（走查全站細節）。

### 骨架定案（Human Owner 拍板 2026-08-17）

| 決策 | 定案 |
|------|------|
| 登入方式 | **LINE Login 網頁版 OAuth**（非 LIFF）。同一個 Login channel → id_token 的 aud 相同 → 後端 `LineVerifier` 零改動，認出的是同一個 LineIdentity/User/RBAC。**不是另一套認證系統。** |
| channel secret 放哪 | **web（Vercel）** 端做 code→token 交換。後端不新增端點、既有測試不受影響。代價：LINE 憑證多一個存放位置（仍為伺服器端）。 |
| 網址 | `/admin/*` 桌面版與 `/liff/*` 手機版共存。同一份程式碼、同一套權限、同一個 DB；**差別只有外框**。 |
| 手機版後台 | **保留**（`/liff/admin/*`）。桌面版是多一條路，不是換一條路。 |
| 誰能進 `/admin` | 園長 / 行政 / 老師可進，各自只看得到有權限的東西；家長導向「請從手機的 LINE 選單使用」的引導頁，不給空白。 |
| 桌面版綁定畫面 | **必做**。後台新建的行政第一次在電腦登入走的就是這條路，少了它會卡在登入頁出不去。 |

### 這一刀的範圍（刻意不做的事）

管理首頁的完整數字、班級/學生/園所外觀搬到桌面版、人員權限設定頁 —— **都不在這一刀**。
骨架先把「進得來、認得出是誰、到得了下一頁、綁得了定」做對；總覽目前只放一個真實數字（尚未綁定人數）。

### 刀 4 設計定案（Human Owner 逐項拍板，2026-08-17）

| 決策 | 定案 |
|------|------|
| 聯絡簿的形式 | **一個孩子的頁面**：當日狀態在上、親師對話在下 |
| 與訊息的關係 | **A：聯絡簿吃掉訊息**（入口收斂成一張卡；Message API 與 `/liff/message` 網址保留並導向） |
| 健康 / 接送 | 放進當日狀態（**當日觀察**，非未來「幼兒健康 / 娃娃車」模組的長期資料） |
| 回溯 | 家長可翻全部歷史；**老師只能填寫/修改近 7 天** |
| 點名即到校 | **合併**——老師點一下同時完成點名與記錄到校時間（同一 transaction） |
| 用餐 | 午餐、點心**分兩欄** |
| 接送 | 只分 **家人接送 / 校車**，不必填哪一位家人 |
| 送出 | 老師**一鍵送出全班**；單一學生可單獨進入處理 |
| LINE 推播 | **老師選擇**：系統自動挑出健康需注意者並詢問是否即時通知；其餘只發站內通知（控費用） |

### 導師減負的六個手段（逐生逐欄約 175 次點擊 → 約 25 次）

1. **例外導向**——預設全班正常，只點不一樣的孩子
2. **直欄模式**——一次一件事、全班一起，注意力不必在欄位間跳
3. **點名即到校**——一個動作完成兩件事
4. **沿用上次**——接送方式九成固定
5. **常用短語**——留言不必從零打字，且**一律選填**
6. **收尾提醒**——「X 位待送出」+ 一鍵送出，老師不用自己記漏了誰

健康與留言**刻意不放進直欄模式**：那是例外情形，逐生處理反而正確也更快（兩種模式並存）。

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
1. ~~ESLint flat config~~ → ✅ RESOLVED（Phase 8, 2026-08-16）: root eslint.config.mjs + CI lint gate。

2. ~~AuditLog append-only 未於 DB 權限層強制~~ → ✅ RESOLVED（Phase 7 Step 6，migration 0002 trigger）。

3. ★ append-only 最小權限 app role（Phase 8 #6-A）— DEFERRED（Human Owner 定案 B, 2026-08-16）
   - Priority: High（合規/正式營運相關）
   - **Required before: 正式上線（Phase 9 pilot → production 之間）** — Claude 屆時主動提醒 Human Owner。
   - 內容: 建 least-privilege app role（AuditLog 只授 INSERT/SELECT、REVOKE 改/刪/清/ALTER）;
     app 改用新 secret `APP_DATABASE_URL`;migrate 續用 owner;每校 provisioning 一併建 role。
   - 動機: 防「app 連線憑證外洩 → 卸 trigger 竄改稽核」的殘餘風險（現階段 trigger 足夠 dev/pilot）。
   - 屬 ADR-003 破壞性 + 新 secret + 每校 provisioning。

4. CSP + X-Frame-Options（web）— DEFERRED: 需裝置實測避免擋 LIFF 登入。正式上線前收緊。
5. Rate limiting — DEFERRED: 同源 proxy 後 API 只見 Vercel IP,宜在 edge/Next proxy 層做。
6. 版型風格模板（per-school layout, §D）— 留待需求出現（YAGNI）。

7b. 聯絡簿的常用短語目前寫死在前端（`features/communication-book/labels.ts`）。
   若園所想自訂，屬 `SchoolConfig` 的小擴充（需 migration）——等實際回饋再做（YAGNI）。

7. ~~清葉改版後的殘留死碼（DashboardCard.tsx / lib/preview.tsx）~~ → ✅ 已不存在
   （2026-08-18 打磨走查對帳：兩個檔案早已刪除，這條是過期的文件）。

8. ~~LINE 帳號綁定機制~~ → ✅ RESOLVED（階段3, 2026-08-17）：綁定碼（8 碼、一次性、可作廢、可解綁）。
   殘留：QR 圖需新套件（§D 待核准）;綁定端點的暴力嘗試防護目前**倚賴碼本身的熵**，
   rate limiting 上線後應一併涵蓋 `/auth/line/bind`（見第 5 項）。
   新增：`/api/admin/oauth/start` 與 `/admin/callback` 也是未認證即可呼叫的入口，rate limiting 時一併涵蓋。

9. ~~建好的人員無法改變角色~~ → ✅ RESOLVED（階段3 ②b, 2026-08-17）：
   §D 提案 + Human Owner 三題定案 → `POST /users/:id/roles` / `DELETE /users/:id/roles/:role`
   + 權限設定頁。詳見 docs/07 §4e、docs/05 矩陣。

10. 桌面後台的 Vercel 預覽環境無法登入 —— LINE 只登記一組 Callback URL（正式網域），
    預覽網域的 redirect_uri 不匹配會被 LINE 拒絕。demo 階段直接上 main，不影響;
    未來若需要預覽登入，需在 LINE 後台補登記或改用固定的預覽網域。
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

DONE
- ✅ Phase 7 — Core MVP COMPLETE（2026-08-16）: Step 1–7 全 ACCEPTED;LINE 推播線上實測收到（Step 5 已驗）。
- ✅ Phase 8 主體（ESLint / exception filter / web 測試 / 安全標頭 / P5 收尾）;#6 定案 B 延後。

DONE
- ✅ **刀 4（每日聯絡簿）線上驗證完畢 — ACCEPTED（2026-08-17）→ Phase 9 階段2 五刀全數完成。**
- ✅ Human Owner 明確指示：**AI 生成老師留言不需要，不做也不再提**（原本就沒實作，僅移除文件提及）。

NOW
- **線上驗收 LINE 綁定碼**（Render 會自動套用 migration 0006）：
  ① 園長帳號 → 我的 → 人員管理 → 點任一個「未綁定」的人 → 編輯 → **產生綁定碼**，畫面會顯示 XXXX-XXXX。
  ② 用**另一支手機／另一個 LINE 帳號**打開系統 → 應該看到「歡迎，先完成一次綁定」而不是錯誤畫面
     → 輸入剛才那組碼 → 應直接進入該身分的首頁（不必再登入一次）。
  ③ 同一組碼再輸入一次 → 應顯示「無法使用」（一次性）。
  ④ 回後台把那個人「解除綁定」→ 對方重新開啟應又回到綁定畫面（救援出口可用）。
  ⑤ 順便看首頁：封面圖現在是首頁的大圖（園名與問候疊在上面），其他頁面不再有橫帶。
- **決定是否加 QR**（需一個新套件，§D；不加也能用連結 `?code=` 免打字）。

DONE（桌面後台，2026-08-17）
- ✅ LINE Developers 已加 Callback URL `/admin/callback`；Vercel 已設
  `LINE_LOGIN_CHANNEL_SECRET` 與 `LINE_LOGIN_CHANNEL_ID`（兩者皆為 web 伺服器端）。
- ✅ **階段3 ① 骨架 + ②b 權限設定 線上驗收通過 — ACCEPTED（2026-08-17）。**
  未逐項回報的兩條分支（桌面版綁定畫面、家長登入後台的引導頁）已實作並有自動測試，
  若日後實際使用時有異狀再修。

NOW（阻塞中）
- **在 Render 的 `sproutin-api` 服務補填 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`**（與 worker 同一組值）。
  `sync:false` 的變數**每個服務各自要填**：推播跑在 worker（已填、正常），圖文選單套用跑在 api（未填）
  → 按「套用到 LINE」會回報「系統還沒設定 LINE 的權杖」。填完 Render 自動重啟即可。
  render.yaml 已加註提醒，開通新園所時兩邊都要填。

NOW（Flex Message 群發，部署完成後 —— Render 會自動套用 migration 0008）
- ① 用電腦開 `/admin/messages` → 版型選「一般通知」→ 填標題與內文 → 右側卡片預覽應同步變化。
- ② 收件範圍選「教職員」（人少、安全）→ 下方應顯示「N 位收得到」，若有未綁定的人會一起說。
- ③ 按「準備送出」→ 應出現「這次會送出 N 則」與「送出後無法收回」，**這時還沒送**
  → 按「確定送出 N 則」→ 你自己的 LINE 應收到一張卡片（園名 + 標題 + 內文）。
- ④ 回頁面下方「送出紀錄」→ 應看到剛才那筆，寫著送出幾則（略過的會說明原因）。
- ⑤ 試「連到外部網址」：貼一個 `http://` 開頭的網址 → 按鈕應該按不下去（限 https）。
- ⑥ 順便驗公告升級：發一則全校公告 → 家長的 LINE 應收到**卡片**（不再是純文字），
  點「查看公告」要能開到公告頁。
- （仍掛著）**線上驗收 LINE 綁定碼**：需要兩個 LINE 帳號，步驟見上方。

（已完成，保留紀錄）驗收刀 4 的步驟 —— 部署完成後（Render 會自動套用 migration 0005）：
  ① 老師帳號 → 底部「聯絡簿」→ 選班級 → 按幾位學生的「到校」→ 回出缺勤頁確認同一批人已變成「已到校」
     （驗「一個動作完成兩件事」）。
  ② 同頁點「全班預設『吃完』」→ 只改一兩個孩子 → 確認其餘沒有被蓋掉。
  ③ 點任一學生進入他的聯絡簿 → 填體溫 37.8 + 勾咳嗽 → 儲存 → 回班級頁按「送出全班聯絡簿」，
     確認跳出「1 位健康需注意，要立刻用 LINE 通知嗎」→ 勾選並送出 → **該生家長的手機應收到 LINE**，
     其他家長**不該**收到（驗「日常不推、緊急才推」）。
  ④ 家長帳號 → 首頁應出現「今日聯絡簿」摘要 → 點進去看得到當日狀態 + 底下的親師對話，
     並可用日期橫條往前翻（demo 種子已備近三天資料）。
  ⑤ 確認底部頁籤「聯絡簿」與首頁卡片都到得了新頁面；舊的 `/liff/message` 會自動導向聯絡簿。

DONE
- ~~建立 Vercel Blob Store（access mode 選 Public）並連到 web 專案~~ ✅ 已完成，上傳實測通過（刀1 ACCEPTED）。

（原始說明保留）
- **Vercel Blob Store（access mode 選 Public）並連到 web 專案** → 園所外觀的「上傳圖片」才會啟用（未接上時該按鈕回報「尚未啟用上傳」，其餘功能不受影響）。
  連上專案後 Vercel 預設以 OIDC 注入 `BLOB_STORE_ID`（+ 自動輪替的 `VERCEL_OIDC_TOKEN`），不一定會有 `BLOB_READ_WRITE_TOKEN`；程式兩種都接受。
  Blob 在 Hobby 方案免費（超出額度會停用而非扣款）。**store 的 public/private 建立後不可更改**，logo/封面需 Public。
- 線上驗收刀 1：用園長帳號 → 我的 → 園所外觀 → 改名稱/顏色/園徽 → 儲存 → 看全站是否即時變樣。

LATER（正式上線前）
- **append-only 最小權限 app role（Phase 8 #6-A）**：Claude 屆時主動提醒;需你在每個 Render instance 填新 secret `APP_DATABASE_URL`。
- **LINE 帳號綁定機制**（後台建的老師/家長帳號 ↔ 本人 LINE）：demo 不做，開賣前必須有（綁定碼 / 手機號比對 / 個人 QR 三選一）;需 migration + 新端點,屆時出 §D 提案。
```

---

## Next Task

```text
**Phase 9 階段3（Human Owner 2026-08-17 拍板的執行順序）：**

  ① 專屬後台骨架        → ✅ ACCEPTED（2026-08-17）
  ②b 人員權限設定頁      → ✅ ACCEPTED（2026-08-17）。§D 提案 + Human Owner 三題定案（全採建議）。
                          提前於 ② 完成，因為 CSV 匯入必須排在它之後（匯入錯了要有救）。
  ② 管理首頁            → ✅ ACCEPTED（2026-08-17）。
                          **Human Owner 決策 C**：只放現有 API 拿得到的數字（待審請假 / 尚未綁定 /
                          班級數 / 學生數），**今日到校與各班一覽先不做**。原因：出缺勤與聯絡簿的
                          查詢端點都必須指定班級，全校統計得逐班發請求（班一多就慢）或新增後端
                          端點（§D）—— 兩者現在都不划算，等真的需要時再一併處理。
  ③ CSV 批次匯入        → ⏸ **暫停（Human Owner 決定，2026-08-17）**。
                          理由：匯入範本要收哪些欄位，取決於系統實際有哪些功能;現在做等於猜。
                          等後續功能陸續完善、欄位明確之後再回來做。
                          （先決條件已備妥：②b 權限設定已完成 → 匯入建錯角色有救。）
  ④ 園所外觀設計        → ✅ ACCEPTED（2026-08-17，線上實測：選單已套用、點擊可到指定頁面）。
                          **Human Owner 定調：圖文選單併入園所外觀，一頁四段**（選單/品牌/卡片/請假）。
                          限制數字已逐項查證（見 docs/07 §4i）。**連「套用到 LINE」一起做**
                          —— Human Owner 說明目前 OA 只有內部人員測試，沒有真實使用者會被影響。
  ⑥ Flex Message 群發    → ✅ IMPLEMENTED（2026-08-17，待線上驗收）。§D 三題已定案。
                          `/admin/messages`：三種版型填空（活動／繳費／一般）、收件範圍
                          （全校家長／指定班級／教職員）、手機卡片預覽、**送出前顯示會送出幾則 +
                          明講不可收回**、送出紀錄。公告推播同步升級為 Flex 卡片。
                          只有 OWNER/ADMIN（老師不得群發：花錢且不可收回）。
  ⑦ 娃娃車 / 接送 刀1   → ✅ IMPLEMENTED（2026-08-18，待線上驗收）。
                          路線與**接送點**設定（電腦＋手機）、隨車老師點名、家長今日狀態、
                          請假自動移出名單（訂閱既有事件，**leaves/ 一行未改**）。
                          刀2（預計抵達時間 + 家長「明天不搭車」+ 上車推播）尚未動工。
  ⑧ 電腦／手機功能對等   → **下一步（Human Owner 2026-08-18 指定）**。原則已寫進 docs/04 §3b。
                          只有電腦版：發送訊息、權限設定
                          只有手機版：班級、學生、聯絡簿、出缺勤、請假、公告、稽核紀錄
  ⑤ 打磨（走查全站細節）→ **一定放最後**，否則新做的頁面又要再打磨一次。⑧ 做完才輪到它。

（歷史候選方向，保留紀錄）

  A. **Demo 打磨到可以直接拿去賣**（建議先做，成本最低、對「賣」最直接）
     - 封面圖呈現方式定案（目前全站 128px 橫帶;選項 A 只首頁／B 首頁 hero 大圖／C 維持）
     - demo 資料鋪厚一點（多幾天聯絡簿、公告、請假，讓人隨便點都不空）
     - 走查一輪三個角色的每一頁，修掉細節破綻
     - 隨手清死碼 `components/DashboardCard.tsx`、`lib/preview.tsx`

  B. **再加一個有賣點的功能**（六張佔位卡挑一張做成真的）
     - 行事曆＝最便宜;成長紀錄（照片/作品）＝招生最有說服力但要處理圖片儲存與量
     - 需先出設計提案 + §D（多半需 migration）

  C. **LINE 帳號綁定機制** → ✅ **IMPLEMENTED（2026-08-17）**，待線上驗收。
     - 採「綁定碼為主、QR 為輔」（Human Owner 拍板）;QR 待新套件核准後補。

  D. 依實際操作回饋微調聯絡簿（選項增減、常用短語改由園所自訂）—— 等你用過再說

（歷史）Phase 7 + Phase 8 主體完成;原 Phase 9 Pilot 已由 Human Owner 改定調為 Demo。
  Phase 9 多為 infra/ops + Human Owner 前置（正式 DB provisioning、每校 instance、LINE 正式 channel、
  試點學校導入資料…），非純 code。Claude 會先出計畫與你需要準備的清單。
  排入正式上線前：append-only 最小權限 app role（Phase 8 #6-A,§D 已定案 B 延後）。
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

下一個 Gate：Phase 9 — Pilot（試點學校導入 + 正式 provisioning 驗收）。
```

（Phase 7 Gate — ✅ 通過:各模組 Online 驗收 + 三角色手機實測 + LINE 推播,Human Owner 2026-08-16。）

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
Commit:  5ec811b（feat(api,web): 人員權限設定（身分可增減）+ 修返回鍵）
Run:     32006276290
Status:  ✅ SUCCESS（build + db + docker-build 全綠）
Date:    2026-08-17
Note:    測試 279（api 234 + shared 12 + web 33）。本次無 migration（UserRole 模型本就支援多角色）。

（前一次）cb4c7cc / run 32004830401 — 桌面版專屬後台骨架 ✅ SUCCESS。
（更前）cffe942 / run 32000075959 — 綁定碼;db job 已驗 migration 0005+0006 + seed idempotent + drift check。
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
Flex Message 群發 — IMPLEMENTED / VERIFICATION_PENDING（2026-08-17）
  `/admin/messages`（版型填空 + 收件範圍 + 兩段式送出 + 送出紀錄）、公告推播升級為卡片、
  migration 0008_push_campaign。測試 364 全綠 + lint / typecheck / build 全綠。
  §D 三題已定案（核准 / 可連外部網址 / 繳費提醒保留）。
Next: ⑤ 打磨（走查全站細節）—— 功能做完才打磨，這是最後一步。

（前一項）Phase 9 階段3 ② 管理首頁 + ④ 園所外觀設計（含 LINE 圖文選單）— ✅ ACCEPTED（2026-08-17, Human Owner）
  commit ccb80aa（管理首頁）、eca3da2（外觀設計 + 圖文選單）、0555506 / 157cfa6 / 5534051（三次修正）。
  線上實測：選單已套用到 LINE、點擊各格可直接開到對應頁面。
  過程修掉的三個問題：① 底圖尺寸必須等於選單尺寸（改為看圖說話）② 批次綁定遇假 ID 整批失敗
  （改為逐一補綁）③ public-config 沉默降級害錯誤訊息謊報成「liffId 未設定」+ liff.state 沒人處理
  導致選單每格只開到首頁。

（前一項）Phase 9 階段3 ① 桌面版專屬後台骨架 + ②b 人員權限設定 — ✅ ACCEPTED（2026-08-17, Human Owner）
  commit cb4c7cc（骨架）+ 5ec811b（權限設定 + 返回鍵）;CI run 32004830401 / 32006276290 全綠。
  線上驗收涵蓋：電腦版 LINE 登入 → 後台、權限總覽與身分增減（含附帶關聯的連帶解除、
  行政看不到園長選項、最後一個身分不可移除）、以及「從後台進手機版頁面後返回鍵回後台」。
Next: ② 管理首頁（概況數字 + 管理入口聚成一頁）。

（前一項）Phase 9 階段2 刀 4 — 每日聯絡簿 — ✅ ACCEPTED（2026-08-17, Human Owner 線上驗證完畢）
  commit a317fd9（+ 540d3ed CI 紀錄）;CI run 31976370995 全綠（build + db + docker-build）。
  db job 已驗 migration 0005 套用 + seed idempotent + drift check 通過。
  → **Phase 9 階段2 五刀全數 ACCEPTED，階段2 完成。**
Next: 下一階段方向待 Human Owner 拍板（見 Next Task 的 A/B/C/D）。
```

（歷史）
```text
Phase 7 Step 6 — ACCEPTED（2026-08-16, Human Owner）
  Audit out-of-band durable path（DENIED/FAILURE/敏感 READ → `audit` 佇列 + DLQ + 無 Redis 降級 → Worker 寫入）
  + 稽核查詢端點 GET /audit-logs（OWNER/ADMIN、篩選、分頁）。ref commit b4f8446（main）。
  append-only DB 層鎖死（決策 2）拆下一版獨立 release（§D 提案）。
Next: append-only §D 提案 / Step 7（Dashboard·Branding·Feature Flag）—— 先計畫→確認→實作。
```

---

## Recent Work Log

### 2026-08-18 — ✨ **打磨 第一批（IMPLEMENTED，待線上驗收）**

功能對等補齊之後的第一輪打磨。**先走查、列清單、由 Human Owner 挑範圍，才動手**
（他四題全選建議案）。七項都不動資料庫、不加端點。

| | 問題 | 做法 |
|---|---|---|
| A1 | 「載入中」「只有園長可以…」在桌面外框裡撐出一整個螢幕高的空白 | `StatusScreen` 加 `fullScreen`（**預設 false**）。只有四個「還沒套上外框」的地方傳 true：`/admin` 與 `/liff` 的 layout、兩個 SessionProvider。順帶修好巢狀 `<main>` —— 外框已經有一個，非整頁時改用 `<div>` |
| A2 | 打錯網址跳出 Next 預設的英文黑白 404 | `app/not-found.tsx`。**不套園所品牌**（它只掛在 RootLayout 底下，拿不到 BrandingProvider，與根路徑同一個限制），清葉的底色字體寫在 `:root` 所以仍然對。一定給得出下一步：回首頁 + 園務後台 |
| A3 | 瀏覽器分頁永遠寫「Sproutin」、沒有分頁小圖示 | `lib/pageTitle.ts`（對照表**只以手機版網址為鍵**，桌面版用新的 `toMobileHref()` 翻回來再查）+ `components/DocumentTitle`（掛在兩個 BrandingProvider 底下各一次）+ `app/icon.svg`。**metadata 用不了**：園名是 runtime 才拿得到的（ADR-001），而全站頁面都是 client component |
| A4 | 圖文選單的格子不能指到娃娃車 | `TARGET_PATHS` 加 `bus`。**只給 STAFF**（`STAFF_ONLY_TARGETS`）—— `/liff/bus` 是隨車老師在車上用的點名頁，家長按下去只會撞到權限牆；家長要看的今日搭車狀態本來就在首頁的卡片上。前端不列給家長，後端 `assertValidDesign(audience, …)` 再擋一次 |
| B1 | 桌面的出缺勤／請假／公告在寬螢幕上只用左半邊 | `components/SplitColumns`：「要動手做的事」左欄、「查詢與翻閱」右欄。**只在桌面外框且兩塊都有內容時**才切（家長只有「申請請假」一塊 → 不切，免得右半邊開一個空洞）。判斷用 `surfaceOf(pathname)`，**不由呼叫端傳 prop** —— 否則兩個十行的 page.tsx 各要記得傳一次 |
| B2 | 稽核紀錄的「操作者」是一串看不懂的 ID | `/audit-logs` 多回 `actorName`（**讀取時才 join，不寫進 AuditLog**：稽核列不存 PII，且改名後歷史紀錄該顯示新名字）。`actorRole` 維持是列上的快照不重新 join —— 稽核要的是「他**當時**以什麼身分做的」 |
| B3 | `lib/adminNav.ts` 的 `onlyMobile` 沒有任何一條在用 | 刪除（含 `AdminShell` 的「手機版」標籤與那條已經失去意義的測試）。守住對等原則的是「導覽已經沒有手機版專屬項目」那一條，它留著 |

**Human Owner 四題定案（2026-08-18）**：
① 這一輪範圍＝A 組四項 + B1 + B2 + C（全選）
② 稽核顯示「**姓名 + 身分**」（例：`王園長（園長）`）—— 能看稽核的本來就看得到全校人員名單，沒有多洩漏
③ 娃娃車那一格**只給老師**；不另做家長版的娃娃車頁（刀2 的「預計抵達時間／明天不搭車」本來就規劃在那一頁，現在做會做半套）
④ `onlyMobile` **刪掉**

**超出範圍的一項（明講）**：稽核每一列加了「只看這個人」的按鈕。原本「操作者」篩選欄要人自己
貼一串 cuid，沒有任何地方查得到 —— 只把 ID 換成姓名的話，看得懂了但還是查不動。約十行。

**走查時發現但這一輪沒做的**（留給第二批，非窮舉）：
- 程式執行期出錯時仍是 Next 預設的錯誤頁（`app/error.tsx` 沒有）—— 與 A2 同一類，但這輪只選了 404。
- 根路徑 `/` 與「找不到頁面」的分頁標題仍是靜態的「Sproutin」（那兩頁刻意不套園所品牌）。
- 通知頁在寬螢幕上仍是單欄（單一列表切兩欄反而難讀，先不動）。

**對帳**：技術債 #7（`DashboardCard.tsx` / `lib/preview.tsx` 死碼待清）**是過期的文件** ——
兩個檔案早就不存在了，已標記為 RESOLVED。

四項全綠：lint / typecheck / **測試 445（api 346 + shared 12 + web 87）** / build。
文件同步：docs/04 §3b（`SplitColumns` + `toMobileHref`）、docs/07（稽核 `actorName`、圖文選單 `bus`）。

### 2026-08-18 — 💬 **親師對話標出發話者（✅ ACCEPTED, Human Owner）**

Human Owner：「對話框泡泡表示出每一句話是來自哪一個家長、老師、或其它人」。

**「這應該不難吧」—— 前端確實不難，卡住的是後端**：`GET /messages` 原本只回 `senderId`（一串 cuid），
前端拿它做的唯一一件事是比對「是不是我自己」以決定靠左還是靠右。**連名字都沒有。**
資料庫裡該有的都有（`User.displayName`、`Guardianship.relation`、`UserRole`），
所以是改一支既有端點的回應，**不新增端點、不動 schema、無 migration**。

**做了什麼（檔案）**
```text
api  messages.service：MessageView 多 senderName / senderRelation / senderRole
     describeSenders()：整串固定兩次查詢（user + guardianship），不隨則數成長
     send() 的發話者在交易外先查好——與這次寫入無關的資料沒有理由佔著交易
web  lib/types：MessageView 同步
     features/message/MessageThread：泡泡上方顯示「陳美玲 · 母親」+ 首字圓形頭像
docs 07（§4f 之後新增一段「親師對話的發話者」）、本檔
測試 425 → 428（api 341 + shared 12 + web 75）
```

**Human Owner 逐項定案**
```text
① 顯示到什麼程度 → **名字 + 身分**（「陳美玲 · 母親」）。
   只顯示身分的話，一班兩位老師就分不出是哪一位，家長問「誰跟我說的」答不出來。
② 圖片 → **先不做**（見下）。
```

**同時是校方又是這個孩子的家長時，顯示家長身分**：老師自己的小孩也在園裡是常見的事，
在那個孩子的對話串裡，他是以家人的身分在講話。有測試釘住。

**同一個人連著講好幾句只標第一句**（換日期重新標）。每句都標，一來一往幾輪就滿版都是名字。

**刻意沒有給家長第二個顏色**：品牌色是每個園所自己設定的，硬配第二個顏色不一定搭。
改成校方實心圓、家長外框圓 —— 任何品牌色都成立。

**中文留在前端**（`RELATION_LABEL` / `ROLE_LABEL` 已存在），後端只給事實。
沿用既有詞彙「父親／母親」而不是另造「爸爸／媽媽」—— 全站同一個孩子的家長在別頁也是這樣寫的。

**查不到發話者時回「未知的發話者」**。帳號一律停用不刪除，理論上不會發生；
真的發生要明講，不能顯示空白讓人以為是系統漏字。有測試釘住。

**圖片為什麼要另外開一刀（§D 已提，Human Owner 定案「先不做」）**
```text
現有的 /api/uploads/image 是 access:'public'（公開網址）且只放行 OWNER/ADMIN，
Message 也只有 body 一個文字欄位。親師對話傳圖 = 老師與家長上傳幼兒照片，三件事都不符合。
公開網址一旦發出就收不回來——那是出事會上新聞的東西。
要做需要：私有 Blob store + 簽名網址（新 infra）、Message 加附件（migration）、
改上傳授權（放行老師與家長但限制範圍）。工程量約娃娃車刀1 的一半。
```

### 2026-08-18 — 🖥️📱 **功能對等 批3：聯絡簿 / 出缺勤 / 請假 / 公告 / 娃娃車點名 / 通知（IMPLEMENTED，待線上驗收）**

最後一批。**至此電腦版與手機版功能全數對等**，只剩三類明文例外（首頁、「我的」、桌面登入／綁定）。

**做了什麼（檔案）**
```text
web  features/{attendance/AttendanceView,leave/LeaveView,announcement/AnnouncementView,
     bus/BusView,communication-book/CommunicationBookView}.tsx
       ← 六個聯集視圖的組裝從 page.tsx 搬進 features（各頁本來就用抽好的元件，
         但「哪些面板照什麼順序出現」還寫在頁面裡，那也是功能的一部分）
     CommunicationBookView 另導出 StudentBookScreen（單一學生聯絡簿）
     features/students/useSelectedStudent：加 useStudentName（兩邊外框組標題用）
     新增桌面外框 app/admin/(app)/{attendance,leave,announcement,notification,
       bus-roster,communication-book,communication-book/[studentId]}
     手機外框全部瘦身為十行上下
     lib/adminNav.ts：每一條都指向 /admin/*，「手機版」標籤全數消失；新增「通知」
     lib/adminEntries.ts + 管理首頁待辦：連結改指桌面版
     lib/surface.ts：PAIRS 補齊六條；startsWithSegment 改為導出的 isPathWithin
     components/AdminShell：目前頁面的判斷改用 isPathWithin
     features/communication-book/TeacherBookPanel：學生連結改用 SurfaceLink
docs 04 §3b（補齊宣告 + 兩邊網址對照表）、本檔
測試 421 → 425（api 338 + shared 12 + web 75）
```

**娃娃車點名的桌面網址是 `/admin/bus-roster`，不是 `/admin/bus/roster`。**
放在 `/admin/bus` 之下的話，左側導覽會同時亮「娃娃車」與「娃娃車點名」兩條。
順帶把導覽的「目前在哪一頁」從 `startsWith` 改成邊界比對（`isPathWithin`）——
否則 `/admin/bus-roster` 一樣會把 `/admin/bus` 點亮，那是同一個 bug 的另一半。

**`adminNav.spec.ts` 多一條測試釘住「導覽上不該再出現 `/liff/*`」**。
這條會在有人加了只有手機版的頁面時失敗 —— 那正是 docs/04 §3b 禁止的事。
規範寫在文件裡會被忘記，寫成測試不會。

**刻意沒有做成對等的三個網址**（已寫進 docs/04 §3b 對照表）：
`/liff/soon/[feature]`（功能預告卡，只從手機首頁的卡片進得去）、
`/liff/message`（舊網址轉址到聯絡簿，服務的是舊書籤與舊通知連結）、
以及首頁／「我的」／桌面登入綁定這三類本來就定為例外的。

### 2026-08-18 — 🖥️📱 **功能對等 批2：權限設定 + 發送訊息 + 稽核紀錄（IMPLEMENTED，待線上驗收）**

批1 已由 Human Owner **ACCEPTED（2026-08-18）**。這一批補三個各差一邊的功能。

**做了什麼（檔案）**
```text
web  features/people/RolesOverview.tsx          ← 從 /admin/roles 搬出（原本邏輯全在頁面裡）
     features/push-campaign/PushCampaignPanel.tsx ← 把權限判斷 + 兩個既有元件收成一個面板
     features/audit/AuditPanel.tsx              ← 從 /liff/audit 搬出（原本邏輯全在頁面裡）
     新增外框 app/liff/admin/roles、app/liff/admin/messages、app/admin/(app)/audit
     瘦身外框 app/admin/(app)/{roles,messages}、app/liff/audit
     lib/adminNav.ts：稽核紀錄改指 /admin/audit，拿掉 onlyMobile
     lib/surface.ts：PAIRS 加 roles / messages / audit
     app/liff/me：園所管理清單補上「權限設定」「娃娃車設定」「發送訊息」
docs 本檔
測試 420 → 421（api 338 + shared 12 + web 71）
```

**手機上找得到才叫做得到**：`/liff/me` 的「園所管理」清單原本只有外觀、班級、學生、人員四條。
新做的手機版權限設定與發送訊息如果不掛上去，等於做了一個沒有入口的頁面。
順帶把**娃娃車設定**也補進去 —— 它原本只能從 `/liff/bus` 點進去，園長要先想到「先開點名頁」才找得到。

**發送訊息為什麼手機也要有**：停課、颱風這類最需要群發的時刻，園長往往不在辦公室。

**稽核的篩選欄位在寬螢幕改成一排**（`sm:` 之後四欄並排）。這是唯一一處我動到排版的地方 ——
四個欄位在 1000px 寬的頁面上直向堆疊會像壞掉的。功能與欄位完全沒變，只有排法隨寬度變，
符合「差別只在操作介面」。

**權限總覽的表格在手機上橫向捲動**，不另做一套窄版排版：兩套排版就是兩份要維護的東西，
而這張表的重點（誰有哪幾個點）橫捲一樣看得到。

**剩下的不對等**（批3）：聯絡簿（兩頁）、出缺勤、請假、公告、娃娃車點名、通知
—— 元件都已抽出，缺的是桌面外框。

### 2026-08-18 — 🖥️📱 **功能對等 批1：學生整合視圖 + 學生 + 班級（IMPLEMENTED，待線上驗收）**

**先把娃娃車刀1 留下的債還掉。** 刀1 把「這個孩子在哪裡上下車」放在學生整合視圖
（那是學生的屬性，Human Owner 定案），而那一頁只有手機版 —— 所以桌面的娃娃車設定流程是斷的：
設定頁的指路連去手機版，園長在電腦上排完路線之後就走不下去了。這一批把那條路接回來。

**Human Owner 兩題定案（2026-08-18）**
```text
① 家長維持只能用手機 —— 桌面版的聯絡簿／請假／出缺勤／公告是做給老師與行政用的。
② 手機首頁（/liff）、電腦總覽（/admin）、「我的」（/liff/me）明文列為例外，不硬做成一樣。
   理由：這三頁是入口不是功能，兩邊服務的人不同，做成一樣一定有一邊變難用。
兩者都已寫進 docs/04 §3b。
```

**抽元件之外多做的一件事：`lib/surface.ts` + `components/SurfaceLink`**

「純搬移 + 參數化」到一半發現搬不動：共用元件裡的連結只能寫死一種網址。
`BusSettingsPanel` 寫的是 `/liff/admin/students?from=admin`、`StudentBusSection` 寫
`/liff/admin/bus` —— 桌面使用者按下去就掉進手機版版型，等於中途換了一個 App。

作法：元件裡的連結一律寫**手機版網址**（既有網址不動），由 `toSurfaceHref()` 依目前外框翻譯。
還沒搬到桌面的功能留在手機版，但**自動補上 `?from=admin`** —— 這件事原本要靠每個連結自己記得寫，
現在變成寫不錯。功能搬到桌面版時只要在 `PAIRS` 加一行，全站指過去的連結一起改。

順帶修好一個既有的小錯：`BusSettingsPanel` 那條連結把 `?from=admin` 寫死了，
真的用手機的園長從娃娃車設定點進學生管理，返回鍵會把他丟到桌面後台。現在由外框決定。

**做了什麼（檔案）**
```text
web  lib/surface.ts（+ spec 7 條）、components/SurfaceLink.tsx
     features/students/{StudentsManager,StudentDetail}.tsx、features/classes/ClassesManager.tsx
       ← 三頁的業務邏輯原封不動搬進來（權限判斷一併搬進元件，見下）
     新增桌面外框 app/admin/(app)/{students,students/[id],classes}/page.tsx
     手機外框瘦身 app/liff/{admin/students,admin/classes,student/[id]}/page.tsx（246/196/171 → 各約 15 行）
     lib/adminNav.ts：班級與學生改指 /admin/*，拿掉 onlyMobile（spec 加一條釘住）
     lib/adminEntries.ts：學生管理入口改指 /admin/students
     bus/{BusSettingsPanel,StudentBusSection}：跨外框的連結改用 SurfaceLink
docs 04 §3b（兩條例外 + surface 機制）、本檔
測試 412 → 420（api 338 + shared 12 + web 70）
```

**權限判斷放在共用元件裡，不放在兩個外框裡**（與娃娃車刀1 的寫法不同，刻意的）：
放在外框就有兩份 `canManageSchool` 判斷，遲早會有一邊漏改，而那正是這一輪要消滅的東西。
前端這一層仍然只決定顯示，真正的授權一律在後端 Guard。

**剩下的不對等**（下一批）
```text
批2  權限設定（/admin/roles，邏輯還在頁面裡）、發送訊息（缺手機外框）、稽核紀錄（/liff/audit）
批3  聯絡簿（兩頁）、出缺勤、請假、公告、娃娃車點名、通知 —— 元件都已抽出，只缺桌面外框
```

### 2026-08-18 — 🚌 **娃娃車 / 接送 刀1（IMPLEMENTED，待線上驗收）**

**Human Owner 的更正改掉了一個資料欄位的意義**：這類娃娃車服務是 **door-to-door** ——
車開到每個孩子的**家門口**，不是開到一個大家去等的站牌。原本的「站點」隱含「一個站牌、很多人在那等」，
與事實不符。用詞改為 **「接送點」**（上下車都適用；「停靠點」太公車、「上車站」下午講不通），
表名一併從提案時的 `BusStop` 改為 `BusPoint` —— 表還沒建，當下改是零成本。

**兩層結構仍然保留**，而且 door-to-door 反而更需要它：兄弟姊妹同一戶共用一個接送點；
「早上從自己家上車、下午送到阿嬤家」也很常見（一個孩子上下午可以是不同接送點）。
折衷是把「這一點要載誰」直接顯示在後台那一列，園長不必為了確認而跳去學生頁。

**Human Owner 逐項拍板**
```text
① 到校後的下車 → 一顆「全部下車」，個別有狀況（半路被家長接走）再單獨處理。
② 隨車老師只看得到自己那台車 → BusRoute.busTeacherId 指名（選項 A）。
   娃娃車跨班，既有的「老師 ↔ 班級」對應解不了「他負責哪一車」；
   沒有這一層，兩台車同時在跑時點錯車不會有任何阻擋。
③ 設定頁做電腦版 —— 並藉此定下全站原則：**電腦與手機功能必須相通**（見下）。
④ 不種假資料 —— 他要直接在後台建。因此改為把「空的時候」做對：
   沒有路線、路線沒有接送點、名單沒有人，各自給一句話說明下一步，不是空白畫面。
⑤ 下午順序預設為上午的倒序，但可以自己再拖（afternoonCustomOrder）。
```

**電腦版與手機版功能對等 —— 升格為永久原則**（Human Owner 明確要求補上）

這條原本只寫在階段3 骨架那一刀的定案裡，沒被拉出來當全站原則，結果後來新做的頁面各做各的。
現已明文寫進 `docs/04 §3b`：功能寫成共用元件，`/admin/*` 與 `/liff/*` 各自只放一層外框，
新頁面兩個外框一起做。娃娃車是第一個照這條做的（`BusSettingsPanel` 兩邊共用）。

**既有的不對等（技術債，下一步就是補這個）**
```text
只有電腦版、手機進不去：發送訊息（/admin/messages）、權限設定（/admin/roles）
只有手機版、電腦進不去：班級、學生、聯絡簿、出缺勤、請假、公告、稽核紀錄
```

**做了什麼（檔案）**
```text
DB    BusRoute / BusPoint / BusAssignment / BusRide + 3 個 enum + migration 0009（expand-only）
      DDL 由 prisma migrate diff --from-empty 產生後逐段取出，確保與 schema.prisma 一致（沿用 0008）
api   bus/{bus.types,bus-settings.service,bus-rides.service,bus.controller,me-bus.controller,bus.module}
      events/bus-event.handler（訂閱 LeaveApproved/Rejected/Cancelled；**leaves/ 一行都沒動**）
      event-handlers.service：Leave 的三個結束態各多一個訂閱者
web   features/bus/{hooks,RouteEditor,BusSettingsPanel,BusBoardingPanel,BusTodayCard,StudentBusSection}
      app/admin/(app)/bus + app/liff/admin/bus（同一個 Panel，兩個外框）
      app/liff/bus（老師點名 + 家長今日狀態的聯集視圖）
      學生整合視圖多一段「娃娃車」；12 條 proxy route
      cards.ts：transportation 轉為已上線（連 /liff/bus）；roadmap 移除該預告條目
docs  03（四張表 + source/sourceRef 的理由）05（矩陣 + BUS_TEACHER scope 落地）
      06（§7 Transportation 訂閱怎麼落地的）07（§4k）04（§3b 功能對等原則）+ 本檔
測試  367 → 412（api 338 + shared 12 + web 62）
```

**幾個刻意的決定**

`/bus/rides/undo` 是原提案沒有的第四個動作。車在動的時候誤觸是必然會發生的事，
沒有它老師只能留著一筆錯的紀錄；它會把時間與位置一併清掉 ——
留一筆「沒上車卻有上車時間」的紀錄比沒有紀錄更糟。

**請假的孩子不進名單，但要回一個數字**。只把人拿掉而不說，老師會以為系統漏人，
然後跑去翻別的頁面確認 —— 那比多顯示一行字慢得多。判斷來源有兩個：請假事件寫下的
`BusRide(ABSENT/LEAVE_EVENT)`，以及當日 `Attendance` 為 `LEAVE/ABSENT`（補網，
涵蓋「先請假、之後才被排進娃娃車」——事件發生當下還沒有名單可寫）。

**`BusRide` 沿用 Attendance 的 override 語意**（ADR-002 的第二次套用，不是新發明）：
孩子早上明明已經上了車、家長才補請假，事件把紀錄蓋成「今日未搭」就是抹去事實。
因此 `source=MANUAL` 的列事件不覆寫，請假取消時也只刪自己寫的那些。

**位置抓不到就是抓不到**：`lat`/`lng` 選填、前端 8 秒逾時、只在按下的當下抓一次，
只進紀錄不參與計算。抓不到照樣點得下去，紀錄標明沒有位置 —— 不假裝有。

**刪除有保護**：已有乘車紀錄的路線不給刪（請改停用，否則爭議時查不到）；
還有孩子掛著的接送點不給刪（否則名單上會出現孤兒）。兩者都回一句看得懂的話，不是 400 了事。

### 2026-08-18 — 🔴 **順手修好 main 的 CI 紅燈（非本刀範圍）**

`pnpm build` 在我這邊失敗，查證後確認**不是我改壞的**：`gh run list` 顯示 CI 自
**cc9f04f**（`fix(web): 根路徑不再把整包 runtime config 印給不特定人看`）起就是紅的。
根因：那一版把根路徑 `app/page.tsx` 改成呼叫 `useBranding()`，但 `BrandingProvider`
掛在 `AppShell` / `AdminShell` 裡，**根路徑不在任何一個之下** → 沒有 provider 就丟例外
→ `next build` 預先產生這一頁時失敗（線上該頁也會白畫面）。

修法：這一頁自己載入 public config，**載不到就用中性名稱**照樣畫得出來 ——
公開頁面不該因為後端沒回應就整頁爆掉。補了一條測試釘住這個情況。


### 2026-08-17 — 🚌 **娃娃車 / 接送：§D 已核准（尚未動工）**

Human Owner 在打磨之前追加的功能。**架構早就留好位置**：`BUS_TEACHER`（隨車老師，scope=乘車名單）
在 docs/05 矩陣裡本來就有、`featureFlags.bus` 開關在、docs/06 已把 Transportation 列為
`LeaveApproved` / `LeaveCancelled` 的未來訂閱點 —— 請假自動從乘車名單移除是**接既有事件**，
不改請假模組一行。範圍基準＝預告頁 `features/roadmap/roadmap.ts` 已對外承諾的六條。

**逐項定案（Human Owner）**
```text
① 不做即時 GPS 追蹤 —— 要車上手機全程開定位，成本與維護都高，還有司機位置的隱私問題。
② 預計抵達時間＝**站序 + 歷史平均**（主），園所自填的預計時間當第一週的底；
   **緯經度只在老師點上/下車的當下抓一次，只進紀錄不參與計算**（爭議時的客觀依據）。
   抓不到（拒絕定位權限／沒訊號）照樣運作，後台標明「這筆沒有位置」——不假裝有。
③ 上車推播**預設關閉**，園所自行開啟（Human Owner 定案）。
④ demo 先種假資料（兩條路線、各四站、把現有 demo 學生分配進去），否則進去是空的。
```

**資料表（migration 0009，expand-only）**：`BusRoute`（路線 + 上下午出發時間）、
`BusStop`（站名 / 順序 / 上下午預計時間）、`BusAssignment`（學生 ↔ 路線 + 上車站 + 下車站，
上下午可不同站）、`BusRide`（每生每日每方向一列：狀態 / 時間 / 選填緯經度 / 誰記錄的）。

**端點**：`/bus/routes`、`/bus/stops`、`/bus/assignments`、`/bus/rides`（+ board/alight/absent）、
`/me/bus`、`/bus/skip`。授權：設定類 OWNER/ADMIN；點名 OWNER/ADMIN/BUS_TEACHER；
家長只能看自己小孩與「明天不搭車」。

**站點在哪裡設定（Human Owner 提問）**：分兩層 —— 路線與站點清單在**後台的娃娃車設定頁**
（全園共用的骨架）；**每個孩子的上車站／下車站在「學生」那一層**（`BusAssignment`），
建議掛在既有的學生管理／學生整合視圖裡多一段「娃娃車」，不另開一頁 ——
園所的實際作業是「這個孩子搭哪一班、在哪站上下」，那是學生的屬性。
**家長不能自己改站點**（會讓路線亂掉），只能「明天不搭車」；換站點要找園所。

### 2026-08-17 — 📣 **Flex Message 群發（IMPLEMENTED，待線上驗收）**

**這一頁在回答什麼**：園所想跟全校家長說一件事時，現在得自己在 LINE 打字（或發公告等家長點進來）。
群發把它變成「選版型 → 填空 → 確認人數 → 送出」，而且送出去的是一張卡片而非一段文字。

**設計的主軸只有一句：送出後無法收回。** 我在官方文件找不到撤回已送出推播的方法，
因此整個設計都從這件事推導：

```text
① 兩段式送出——第一顆按鈕只是「準備送出」，把「這次會送出 12 則」與「無法收回」攤在眼前，
   第二顆才真的送。刻意不用確認對話框：對話框會被習慣性按掉。改動內容會退回第一段
   （避免看著舊的則數按下確定）。
② 人數一定給兩個數字——「12 位收得到、另有 3 位還沒綁定 LINE（收不到）」。
   只給一個數字，園長會把「沒綁定的人收不到」誤判成系統漏發。
③ 留帳（PushCampaign 這張表存在的唯一理由）——誰、何時、發了什麼、給幾個人、結果如何。
   沒有帳的話，家長問「你們到底發了什麼給我」時沒有人回答得出來。
④ 失敗不自動重試——這是本專案第一個「handler 失敗不丟出」的事件（見下）。
```

**為什麼群發的失敗處理與其他事件相反**
```text
其他事件（請假核准、聯絡簿）重試最多讓一位家長收到重複訊息 → 重試划算。
群發一次是全校兩百則：自動重試＝再收一次費用 + 已收到的家長再收一次。
因此 handler 把實際結果（送出/略過則數 + 失敗原因）寫進 PushCampaign 並標 FAILED，**不丟出**，
讓園長在後台看到「只送到 150 位」後自己決定要不要重發。狀態、數字、原因都寫下來且顯示
→ 這不是沉默降級。同理，看到 status ≠ QUEUED 就當成重放直接略過（worker 重啟時
resetStaleProcessing 會重放事件，而群發重放一次就是全校再收一則）。
卡在 SENDING 的（上一輪送到一半進程掛掉）會在重放時改標 FAILED 並老實說「無法確認送出幾則」
—— 永遠顯示「正在送出」比承認不知道更糟。
```

**先查證再動工（不憑印象編數字）**
```text
查到的：一次 push 最多 5 個訊息物件（我們用 1）｜定義一個 bubble 的 JSON ≤10KB｜頻率 2000 次/秒
查不到的：altText 字數上限、Flex 內圖片的規格、multicast 一次幾人與部分無效時的行為
→ 因此不依賴未知數：標題/內文/欄位/按鈕文字/altText 全部先用**我們自己訂的**保守上限截斷
  （有測試釘住 bubble JSON < 10KB）；圖片只收 PNG/JPG ≤1MB；
  **不用 multicast**——部分失敗行為查不到，而「單一收件人失敗不可拖垮整批」是踩過兩次的硬規矩。
出處：LINE Messaging API 官方文件（2026-08-17 逐項查證）
```

**Human Owner 的兩個定案，與我的建議不同的地方**
```text
按鈕的目的地：我建議只給 App 內頁（家長點下去一定在我們系統裡）；他選「可外部」——
  報名表單這類需求確實存在。落地：後端**限 https://**（LINE 的 uri action 不吃 http，
  而 javascript:/data: 放行就是把家長送到我們無法保證的地方），前端明講「我們無法確認
  那個頁面安全或還活著」，責任歸園所。
繳費提醒：保留。他的原話是「不假裝自己是收費系統，就是提醒」——因此金額與期限都是
  **顯示用文字**（不是數字/日期型別），欄位標籤直接寫「（顯示用文字）」，
  版型說明寫明「系統不會記帳也不會自動追繳」。
```

**「顯示用文字」不是偷懶，是刻意**：`eventDate` 不做 DateTime、`amount` 不做數字，
園所才寫得出「9/20（六）09:30」「約 8,500 元（含餐費）」。硬要結構化只會逼出假資料。

**做了什麼（檔案）**
```text
DB    PushCampaign + enum PushCampaignTemplate/Audience + migration 0008（expand-only）
api   push-campaigns/{push-campaign.types,campaign-audience,push-campaigns.service,
      push-campaigns.controller,push-campaigns.module}
      events/{flex-message,push-campaign-event.handler} + line-push.client 加 pushFlex
      push-notification.service：送信迴圈抽成唯一一份 deliver()（回傳結果，呼叫端決定是否重試）
      公告推播改送 Flex 卡片（buildAnnouncementFlex，與群發共用產生器）
web   features/push-campaign/{types,hooks,CardPreview,MessageComposer,CampaignHistory}
      app/admin/(app)/messages/page.tsx + 2 條 proxy route
      uploads/image 加 campaign 類型（PNG/JPG ≤1MB）；adminNav / adminEntries 加入口
docs  03（PushCampaign）05（矩陣：CR，老師不可）06（PushCampaignQueued + 不重試的理由）
      07（§4j，含查到/查不到的限制表）+ 本檔
測試  315 → 364（api 297 + shared 12 + web 55）
```

**收件人解析寫成純函式**（`campaign-audience.ts`，不進 DI）：api 要算預估人數、worker 要算實際
送信對象，若做成 provider 就得讓 worker 的精簡 DI 圖去 import 業務模組 —— 圖文選單那邊已經
踩過模組循環相依。另外 worker 送出時會**重新解析一次**：建立與送出之間可能有人剛完成綁定。

**「指定班級」不含該班老師**：老師走「教職員」那個選項。勾一個班卻連老師一起發，園長不會預期。

### 2026-08-17 — 🎛 階段3 ④：**園所外觀設計＝品牌 + LINE 圖文選單（IMPLEMENTED，待線上驗收）**

**Human Owner 定調：圖文選單不是獨立功能，它和園所外觀是同一件事**——都是「這間園所在家長
眼中長什麼樣子」。因此收成一頁「園所外觀設計」（桌面版 `/admin/appearance`），順序刻意把
**圖文選單放第一**：家長最先看到的是 LINE 選單，不是 App 內頁。

**先查證再動工（Human Owner 明確要求不可憑印象編數字）**
```text
底圖 JPEG/PNG、≤1MB、寬 800–2500、高 ≥250、寬/高 ≥1.45
一份選單最多 20 格；name ≤300 字、chatBarText ≤14 字
一個官方帳號最多 1000 份選單；**建立選單 100 次/小時**
批次綁定一次 500 人、2000 次/秒、非同步（202 不等於全部成功）
每格連到 https://liff.line.me/{liffId}/{path}（LIFF 以 liff.state 轉址）
出處：LINE Messaging API reference（2026-08-17 逐項查證）
```

**一個被更正的說法**：先前引用官方文件寫「底圖不能替換」，Human Owner 指出他實際操作可以換。
兩者都對，只是角度不同 —— **官方後台的「換底圖」是幫使用者在背後重建一份**；用 API 時同一個
選單 ID 的圖確實不可覆蓋。我們的系統做的是同一件事，使用者感受到的就是「換好了」。

**因此有兩個設計決定**
```text
① 儲存與套用分開：園長調版面會存很多次，若每次都建選單會撞上每小時 100 次上限。
   PUT 只寫本地資料庫；apply 才動 LINE。
② 套用順序＝建新的 → 上傳圖 → 綁人 → **最後**刪舊的。
   先刪的話中途失敗會讓全園所暫時沒有選單。這一點有測試釘住（順序斷言）。
```

**還沒綁定的人怎麼辦**：不逐一綁定（我們根本不知道他們是誰），而是設為 LINE 的「預設選單」。
個別綁定的優先權高於預設，所以已綁定者不受影響。**綁定成功的當下**由
`BindingCodeService.redeem()` → `RichMenuLinkService` 換上對應身分那一份；
**這一步失敗絕不可讓綁定失敗**（錯誤只記錄不丟出），沒換到的話園所下次套用會補上。
為避免 AuthModule ↔ RichMenuModule 循環相依，換選單那一支獨立成不依賴 AuthModule 的小模組。

**做了什麼（檔案）**
```text
DB    RichMenuConfig + enum RichMenuAudience/RichMenuTemplate + migration 0007（expand-only）
api   rich-menu/{types,line-rich-menu.client,rich-menu.service,rich-menu-link.service,
      rich-menu.controller,rich-menu.module,rich-menu-link.module} + spec（16）
      binding-code.service 綁定成功後換選單
web   features/rich-menu/{types,hooks,MenuPreview,RichMenuSection}
      app/admin/(app)/appearance/page.tsx（圖文選單 + 品牌 + 卡片 + 請假流程，四段一頁）
      features/school/AppearanceEditor.tsx（自手機版抽出，兩邊共用）
      3 條 proxy route;uploads/image 加 richmenu 類型（PNG/JPG + 1MB 上限）
docs  03（RichMenuConfig）05（矩陣）07（§4i，含查證到的限制表）+ 本檔
測試  283 → 299（api 250 + shared 12 + web 37）
```

**預覽刻意把格線疊在底圖上**：底圖是園所自己畫的，「圖上的按鈕」與「實際可點的區域」對不齊
是這類設計器最常見的失誤，看得到格線才發現得了。

### 2026-08-17 — 🏠 階段3 ②：**管理首頁（IMPLEMENTED，待線上驗收）**

**這一頁在回答什麼**：園長早上打開電腦，三十秒內要知道「今天有沒有事要我處理」。
所以順序是 數字（現況）→ 需要你處理（待辦）→ 常用入口。待辦清單只列數量不為零的項目，
沒事就明說「今天沒有待辦，一切正常」—— 空清單比假的待辦更有用。

**Human Owner 決策 C：先不做「今日到校」與各班一覽**
```text
查到的限制：attendance.controller.ts 與 communication-book.controller.ts 在缺少
classId/studentId 時直接回 400 —— 兩者都沒有「整校一次查」的方式（授權以班級為單位判斷）。
選項 A（前端逐班發請求）：十個班就十次請求，之後每加一個數字又多一輪。
選項 B（新增 GET /dashboard/summary，§D）：快且好維護，但這一刀要多寫一支端點。
選項 C（只放拿得到的）→ **採用**。首頁先做好，那兩塊等真的需要時再一併處理。
```

**放上去的數字**（全部來自既有端點，零後端改動）：待審請假（`GET /leaves?status=PENDING`）、
尚未綁定人數（`GET /users`）、班級數（`GET /classes`）、在學學生數（`GET /students`）。
這些 API 只開放園長/行政，老師呼叫會 403 → 全校概況獨立成 `SchoolOverview` 元件，
由上層依角色決定要不要掛載（hook 不能寫在條件式裡）。

**順手加的防呆**：首頁的快速入口也連到手機版頁面，同樣必須帶 `?from=admin`，否則又會重演
「按返回被丟到手機版首頁」。把入口清單抽成 `lib/adminEntries.ts` 並加測試守住這件事
—— 這是同一類 bug 的第二個發生地點，值得用測試釘住而不是靠記得。

```text
web   app/admin/(app)/page.tsx（改寫）+ lib/adminEntries.ts + spec（4）
測試  279 → 283（api 234 + shared 12 + web 37）
```

### 2026-08-17 — 🔑 階段3 ②b：**人員權限設定（IMPLEMENTED，待線上驗收）** + 修返回鍵

**§D 提案 → Human Owner 三題全採建議（2026-08-17）**

| 決策 | 定案 | 為什麼 |
|------|------|--------|
| 誰能改權限 | OWNER/ADMIN 都能改，**但「園長」身分的授予與移除只有 OWNER** | 不然行政可以自行升級為園長，整張權限矩陣形同虛設 |
| 拔掉身分時附帶關聯 | **一起解除**，並在按下之前明講「會同時取消他帶的 N 個班」 | `ScopeResolver` 是依 TeacherAssignment/Guardianship 放行的，留著就是幽靈權限 |
| 可否在後台指派園長 | **可以**，但只有現任園長看得到這個選項，且需二次確認 | 不給的話園長交接永遠只能改資料庫 |

**採用方案 A（增/刪各一個端點），不採「全量取代」**：全量取代在兩人同時操作時會互相蓋掉，
稽核也只記得到結果、記不到意圖，而且容易一次刪光。增刪分開則每個動作對應一筆稽核
（`user.role_grant` / `user.role_revoke`），記得下「誰在什麼時候給了誰什麼權限」。

**兩道把園所鎖死的防呆**
```text
最後一位園長的園長身分不可移除（沿用既有 assertNotLastActiveOwner）。
每人至少保留一個身分 —— 零身分的帳號登得進來卻什麼都看不到，那是離職，應該用「停用帳號」。
移除以 deleteMany({ userId, role }) 不限 scope：seed 的 TEACHER 帶 CLASS scope、
後台建的帶 SCHOOL scope，兩種都要清得掉，否則會留下清不掉的殘角色。
同時是 TEACHER 與 BUS_TEACHER 時，拔掉其中一個不會清空班級（仍是教職身分）。
```

**順手修掉的 bug（Human Owner 回報）**：從桌面後台點進手機版功能後按「上一頁」，
會被丟到手機版首頁而不是回後台 —— `PageHeader` 的返回鍵寫死 `href="/liff"`。
修法刻意**只改變「從後台進來」的情形**：後台的連結帶 `?from=admin`，記在 sessionStorage，
之後同分頁的子頁都回得去；按了手機版底部頁籤即清除（＝決定留在手機版）。
**不用 `router.back()`**：LIFF 在 LINE 內是經過多次轉址進來的，彈回去會掉進登入鏈。

**做了什麼（檔案）**
```text
api   users.service.ts grantRole/revokeRole + assertMayChangeOwnerRole
      users.controller.ts POST /users/:id/roles、DELETE /users/:id/roles/:role
      users.service.spec.ts +13（含行政不能自我升級、最後園長、最後身分、CLASS scope 清除）
web   features/people/RolesSection.tsx（身分增減 + 移除前明講附帶影響）→ 併入 PersonEditor
      app/admin/(app)/roles/page.tsx（權限總覽：一頁看完誰有什麼身分，點「調整」開同一個編輯器）
      lib/backTarget.ts + spec（返回目標）;PageHeader / AppShell / AdminShell 配合
      2 條 proxy route;hooks 加 useGrantRole/useRevokeRole + 4 則錯誤訊息
docs  07 §4e（身分增刪）+ 端點表、05 矩陣新增 UserRole 列與說明、本檔
測試  262 → 279（api 234 + shared 12 + web 33）
```

### 2026-08-17 — 🖥 階段3 ①：**桌面版專屬後台骨架（IMPLEMENTED，待線上驗收）**

**先更正一個說法**：先前曾說「電腦後台等於另做一套認證」——**不對**。LIFF 與網頁版 OAuth 屬於
**同一個 LINE Login channel**，兩邊拿到的 id_token 其 `aud` 都等於 `LINE_LOGIN_CHANNEL_ID`，
所以後端 `LineVerifier` 一個字都不用改，認出來的是同一個 `LineIdentity` → 同一個 `User` → 同一套 RBAC。
差別只在「怎麼拿到 id_token」：LIFF 由 SDK 直接給；網頁版要用一次性 code 去換，而**換的那一步需要
channel secret**（LINE 官方文件：token 端點的 `client_secret` 為必填）。這就是唯一的新東西。

**為什麼 secret 放 web 而不是 api**（Human Owner 拍板）
放 web 表示 code→token 交換在 Next 的 route handler 完成，換到 id_token 後直接呼叫**既有的**
`/auth/line/login` —— 後端零改動、不新增端點、既有 221 個 api 測試完全不受影響。
放 api 則要新增一個端點，而 web 該做的事（state cookie、回呼、redirect_uri）一件也沒少。

**安全設計**
```text
state：隨機 16 bytes → httpOnly cookie（10 分鐘）→ 回呼時比對，不符即拒。防「別人誘導你的
       瀏覽器完成一次他發起的授權」。用完立刻清除。
id_token 全程不進前端：桌面版「登入成功但還沒綁定」時，token 存 httpOnly cookie（10 分鐘）
       供 /admin/bind 使用；綁定成功即清除。前端從頭到尾拿不到任何 LINE 憑證。
未採 PKCE：交換在伺服器端且必帶 client_secret（confidential client），code 已綁 redirect_uri
       且為一次性，PKCE 在此不增加實質保護；CSRF 由 state 擋。
redirect_uri 不匹配時 LINE 直接拒絕 —— 不會有靜默失敗。
```

**「同一份功能、兩種外框」怎麼落實的**
把手機版人員管理頁的內容整段抽成 `features/people/PeopleManager.tsx`，手機版與桌面版兩個 page
都只是薄薄的外框 + 標題。這不是巧合式的重用，而是這條路線的驗證：**功能與授權不分岔，只有密度不同。**

**做了什麼（檔案）**
```text
web/server  lib/server/line-oauth.ts（授權網址、code→id_token、state/bind cookie、publicOrigin）
            app/api/admin/oauth/start/route.ts（產 state → 導向 LINE）
            app/admin/callback/route.ts（驗 state → 換 token → 走既有 /auth/line/login → 設 session）
            app/api/auth/line/bind/route.ts 改為 body 沒帶 idToken 時改讀 cookie（手機/電腦共用同一端點）
web/client  components/AdminShell.tsx（左側常駐導覽;窄畫面自動改為上方橫向捲動，不做第二套版型）
            lib/adminSession.tsx（只看 cookie，不碰 LIFF;家長→引導頁不給空白）
            lib/adminNav.ts（依角色顯示;尚未搬到桌面的項目標「手機版」連到 /liff/*，不做死角）
            app/admin/layout.tsx（品牌）+ (app)/layout.tsx（身分 + 外框）
            app/admin/login|bind|(app)/page.tsx|(app)/people/page.tsx
            lib/session.tsx 抽出 AuthedSession（手機與電腦共用同一個 SessionContext）
            features/people/PeopleManager.tsx（自 /liff/admin/people 抽出，兩邊共用）
測試        lib/server/line-oauth.spec.ts（8）+ lib/adminNav.spec.ts（5）→ web 16 → 29
env         **新增 `LINE_LOGIN_CHANNEL_SECRET` 與 `LINE_LOGIN_CHANNEL_ID`（web/Vercel，伺服器端）**
            選用 `WEB_PUBLIC_URL`（未設定時由 x-forwarded-host 推導）
```

**過程中發現的缺口（已寫入 Technical Debt #9）**：`PATCH /users/:id` 只能改姓名與啟用狀態，
**建好的人員無法改變角色、也無法加第二個角色**。Human Owner 已指定要做一頁權限設定；
排在 CSV 匯入之前，因為匯入一次建幾百人，角色不能事後修正的話，匯入就是不能反悔的動作。

### 2026-08-17 — 🔗 階段3 起手：**LINE 帳號綁定碼（IMPLEMENTED，待線上驗收）** + 首頁 hero + 收尾

**為什麼先做這個（Human Owner 拍板順序 C → B → A）**
原本把綁定歸類為「開賣前才需要」，這個定位不完整：**它是 demo 現場就會被問到的洞**。園長看完
聯絡簿一定會問「那我二十幾個老師、三百個家長怎麼開始用？」，而在此之前的答案是「還沒做」。
補上之後，展示多了一段最能回答「導入麻不麻煩」的流程。另外綁定是三個候選項裡技術風險最高的
（牽涉 LINE 平台與真實使用者流程），早做早知道會不會踩坑。

**A（打磨）為什麼排最後**：A 的內容是「把所有頁面走一遍修細節」，而 B/C 都會生出新頁面。
先打磨再加東西，等於同一件事做兩遍。

**機制選型（Human Owner：綁定碼為主、QR 為輔）**
市面上 LINE OA 的身分綁定就是幾套固定模式：綁定碼／一人一連結或 QR／既有資料比對（手機+生日）／
簡訊 OTP／行政代綁。幼兒園場景的決定性條件是「行政人力少、家長數量大、科技程度落差大」，
所以贏的是**能批次產生、印在通知單上發下去就不用管**的做法 → 綁定碼。

**安全設計（這是憑證，不是一般欄位）**
```text
8 碼、32 字母表（排除 0/O/1/I/L）≈ 1.1×10^12 組合 —— 刻意不用 6 位數字：
  6 位數只有 100 萬組，在 rate limiting 尚未上線的情況下可被暴力嘗試（見 Technical Debt #5）。
期限 30 天 + 用過即失效 + 可作廢；重新簽發時舊碼一併作廢（條子不見了就重發，舊碼不留著）。
查無/已用/已作廢/已過期 → 一律回同一個錯誤碼，否則等於提供可探測有效碼的介面。
一個 LINE 只能綁一個人；兌換用條件式 updateMany 樂觀鎖，同碼並行只有一個成功。
稽核不存碼本身，也不存 lineUserId（皆為識別性資料，修正 C）。
綁定即登入：/auth/line/bind 一次完成驗證+兌換+簽發，避免多出一個「已驗證但無身分」的臨時 token。
```

**做了什麼（檔案）**
```text
DB      BindingCode + migration 0006_binding_code（expand-only）
api     auth/binding-code.{service,controller}.ts + spec（21 tests，含樂觀鎖與各種失效情境）
        auth.service.ts 加 bindWithLine();issueToken() 抽出供登入/綁定共用（登入維持單次查詢）
        users.controller.ts 加 DELETE /users/:id/line（解綁救援出口）
web     features/binding/BindScreen.tsx（未綁定者的第一個畫面;支援 ?code= 自動帶入）
        session.tsx 認出 user_not_provisioned → 導向綁定畫面（那不是錯誤，是還沒綁）
        features/people/BindingSection.tsx（後台發碼/重發/作廢/解綁，三種狀態各有明確下一步）
        4 條 proxy route
其他    首頁 hero（封面圖只在首頁、園名歡迎語疊字;無圖時退回品牌色塊，不會像壞掉）
        清死碼 DashboardCard.tsx / preview.tsx（連帶簡化 branding.tsx 與 liff/layout.tsx）
        seed 鋪厚：聯絡簿補到近 7 天、+2 則全校公告、+1 筆待審請假、+4 則親師對話
docs    03（BindingCode）05（權限列 + 說明）07（§4g + 端點表）+ 本檔
```

**尚未做、需要你點頭的一件事**：**QR**。產生 QR 圖需要一個新套件，依規矩不能自行加入（§D）。
目前已可用的替代：綁定畫面支援 `?code=` 自動帶入，所以園所用 **LINE 或訊息發連結**時，家長點開
就免打字；QR 只是把同一條連結印成圖給紙本用。你點頭我再加，工作量不大。

**驗證**：本機 lint / typecheck / **測試 249（api 221 + shared 12 + web 16）** / build 四項全綠。


### 2026-08-17 — 📓 Phase 9 階段2 刀 4 — **每日聯絡簿 ✅ ACCEPTED（線上驗證完畢）→ 階段2 完成**

**設計的關鍵轉折（Human Owner 主導）**
初版提案把聯絡簿設計成一張「表單」，等於把紙本搬上螢幕。Human Owner 指出正確形式是
**「一個孩子的頁面」**：當日狀態在上、親師對話在下，一頁掌握。而既有的 `Message` 本來就綁在
`studentId` 上——每個孩子早就有一條專屬對話串，所以不是「再做一個聊天室」，而是**在既有對話串上方
釘一塊當日狀態**。由此推出「訊息卡併入聯絡簿」（決策 A），也讓「家長回覆一則還是多則」這題自動消失
（回覆＝對話本身）。

**資料只新增一層**

| | 內容 | 來源 |
|---|---|---|
| 讀來的 | 到校/缺席、請假 | Attendance / Leave（各自 SoT，**不複製**） |
| 老師填的 | 午餐·點心·午睡·如廁·心情·健康·接送·留言 | 新表 `CommunicationBookEntry` |
| 聊的 | 親師對話 | Message（原封不動） |

→ 「與出缺勤、請假互通、不必重複填寫」因此自然成立。

**做了什麼（檔案）**
```text
DB      packages/db/prisma/schema.prisma + migrations/0005_communication_book（expand-only，純新增一表 + 6 enum）
        seed.ts 補近三天 demo 紀錄（含一位健康需注意、一位尚未送出）——demo 打開就要有東西可翻
shared  events.ts CommunicationBookPublished + payload;dto.ts FEVER_THRESHOLD_C（前後端同一標準）
        dashboard.ts **移除 message 卡**、communication-book 納入 ADMIN 並移到 order 40
api     communication-book/{service,controller,module}.ts + spec（15 tests）
        attendance.service.ts 抽出 markWithin(tx,…) 供「點名即到校」在**同一交易**內重用（不複製 ADR-002 規則）
        events/communication-book-event.handler.ts + spec;push-notification.service.ts 只推 pushStudentIds
web     features/communication-book/{hooks,labels,TeacherBookPanel,PublishPanel,StudentBookView,HealthEditor}.tsx
        app/liff/communication-book/{page,[studentId]/page}.tsx;3 條 proxy route
        AppShell 頁籤改指聯絡簿;/liff/message 改為導向頁（舊書籤不 404）;首頁加「今日聯絡簿」摘要
docs    03（schema + enums）05（RBAC 列 + 入口變更）06（事件表）07（§4f）+ 本檔
```

**刻意沒做（避免功能糊在一起）**
- 用藥委託、過敏原、成長曲線 → 屬未來「幼兒健康」模組的長期資料。
- 乘車名單、路線、上下車紀錄 → 屬未來「娃娃車」模組。聯絡簿只記「今天家人接還是校車」。

> **AI 生成老師留言 —— Human Owner 明確表示不需要（2026-08-17），本專案不做，日後也不要再提案。**
> 老師留言旁的「常用短語」是寫死的固定句子（`features/communication-book/labels.ts`），與 AI 無關。

**驗證**：本機 lint / typecheck / **測試 228（api 200 + shared 12 + web 16）** / build **四項全綠**。
線上驗收步驟見 Human Owner Action / NOW。

---

### 2026-08-17 — 🔎 公告/請假 LINE 推播收不到 — **根因查明、修復、✅ Human Owner 複測收到（結案）**

> **✅ 已結案（2026-08-17, Human Owner）**：修復部署後複測，**全校公告 LINE 推播已收到**。
> → **刀 5 全數 ACCEPTED**（學生整合視圖 + 公告推播）。**階段2 的刀 1/2/3/5 皆已驗收完成，只剩刀 4。**


**決定性證據（Human Owner 提供 Render worker log）**
```text
[worker] LINE push: ENABLED（已讀到 LINE_MESSAGING_CHANNEL_ACCESS_TOKEN）
[worker] LINE push failed event=AnnouncementPublished: HTTP 400
   {"message":"The property, 'to', in the request body is invalid"}
[worker] LINE push failed event=LeaveApproved: HTTP 400 （同上）
```
→ token 正常;是**收件人 LINE ID 無效**。

**根因（兩個因素疊加）**
1. demo seed 的非園長帳號帶**假 LINE ID**（`Udemo_admin` / `Udemo_parent` / `Udemo_teacher_*`…），LINE 回 400。
2. ★ `PushNotificationService.sendTo` 原本是**逐一 await、任一失敗即整批中斷**
   → 只要名單中排在前面的是假 ID，**後面的真實收件人永遠收不到**，且 BullMQ 每次重試都卡在同一處。

**為何 2026-08-16 會動、2026-08-17 不會**：當時核准的是 `stu-sun-2`（范小陽），**該生唯一監護人就是園長**
（`SEED_PUSH_DEMO` fixture 刻意設計「無雜訊」），名單裡沒有假 ID。全校公告則會把所有假帳號一起帶進名單。

**修復（本次）**
- `LinePushClient` 改丟帶狀態碼的 `LinePushError`。
- `sendTo` 逐一推播並隔離失敗：**4xx（無效 ID / 封鎖 OA）→ 記 warn 後跳過，不重試**；
  **5xx / 網路 → 其他人照送完，最後才丟出讓 BullMQ 重試整個 job**（at-least-once：
  已成功者可能重複收到，優於整批漏發）。
- 測試 +2（400 略過續送、500 續送後仍丟出）。api 179 → **181**。

**這是韌性缺陷，非資料問題**：即使正式環境沒有假 ID，任何一位家長封鎖 OA（403）也會造成
「全班其他家長都收不到」。修復後不再有此風險。

### 2026-08-17 — Bug fix / 請假清單不自動更新（Human Owner 實測回報）

**現象**：園長申請請假後，上方「全校待審請假」不會立即出現，必須手動重整頁面。
**根因**：`useCreateLeave` 成功後只失效 `['leaves', studentId]`；老師的整班待審 `['leaves','class',…]`
與園長的全校待審 `['leaves','school','PENDING']` 是不同 key、**前綴不相符** → 未被通知重取。
**修法**：改為以前綴 `['leaves']` 一次失效（與 `useCancelLeave` / `useSetLeaveStatus` 一致）。

### 2026-08-17 — Phase 9 階段2 刀5 / 學生整合視圖 ✅ ACCEPTED + 公告 LINE 推播 ⚠ 待確認

**Human Owner 驗收（2026-08-17）**：學生整合視圖 ✅ 通過。**公告 LINE 推播 ❌ 手機未收到 —— 未結案**。

**已排除**：程式已部署（線上探測 `/students/:id/detail`、`/users`、`/school/config` 皆回 401＝路由存在）；
worker 對每個事件都會 enqueue `line-push`，過濾在 `PushNotificationService`；`allUsers` 不排除發布者。

**最可能原因（待 Human Owner 複測釐清）**
1. **測試當下 Render worker 尚未完成重新部署**（CI 20:41 綠 → Render Docker build 另需數分鐘）。
   舊 worker 處理該事件後即標 DISPATCHED，不會重跑 → 該則公告永遠不會補推。
2. **發的是班級公告、而該班與園長無關**（班級公告只推該班老師 + 該班家長；園長僅與向日葵班有監護關係，
   來自 `SEED_PUSH_DEMO` fixture）。

**第三次複測（Human Owner，2026-08-17）— 決定性線索**
- **鈴鐺（站內通知）有出現該則公告** → worker 活著且事件處理正常（outbox → handler → Notification 全通）。
- **`sproutin-worker` 已 Manual Deploy 且 Live**，再測公告與請假核准 → **兩者都沒有 LINE**。
- ⚠ **請假核准推播是 Step 5 已驗收過、原本會動的功能，現在也收不到** → 問題**不在刀5 的公告程式碼**，
  而在推播鏈的共用段。

**結論：最可能是 `sproutin-worker` 的 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` 未設定或失效。**
理由：`LinePushClient` 在無 token 時是**安靜略過**（只 warn，不丟出）→ 症狀正好是「站內通知全正常、
LINE 全無、沒有任何錯誤」。該 env 在 `render.yaml` 為 `sync: false`＝**必須由 Human Owner 於 Render 後台手動填**，
不會隨 Blueprint 帶入（Step 5 亦曾發生「worker 未吃到 token」）。

**Human Owner 要做的檢查（依序）**
1. Render → `sproutin-worker` → **Environment** → 確認 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` 存在且非空。
   （注意：api 與 worker 是**兩個獨立服務**，各自有自己的環境變數，填在 api 上 worker 也讀不到。）
2. Render → `sproutin-worker` → **Logs** → 找這行（本次已加，見下）：
   `[worker] LINE push: ENABLED` ／ `DISABLED — …未設定`。
   若見 `DISABLED` → 就是 token 沒填 → 填上後重新部署即解決。
   若見 `ENABLED` 但仍收不到 → 找 `LINE push failed: HTTP <code>` ——
   401=token 失效需重新產生;403=權限/好友問題（收播帳號需為該 OA 好友且未封鎖）。

**本次程式改動（讓這類問題不再只能用猜的）**
- `worker.ts` 啟動時印出 LINE 推播是否可用（`[worker] LINE push: ENABLED/DISABLED`）。
  動機：token 未設定原本完全靜默，從外部無法判別。

**複測結果（Human Owner，2026-08-17 第二次）**：確定發的是**全校公告**；**公告列表有顯示**（＝POST 成功、
Announcement 已寫入），**LINE 仍未收到**。⚠ 注意：公告列表只讀 Announcement 資料表，**不能證明 outbox 事件
已被 worker 處理**；真正的證據是「鈴鐺是否出現該則通知」（尚未確認）。

**目前最可能原因（順位已更新）**
1. ★ **Render `sproutin-worker` 服務未更新到新版**（api 與 worker 為 render.yaml 中兩個獨立服務；
   已確認 **api 是新版**——線上 `/students/:id/detail`、`/users`、`/school/config` 皆回 401＝路由存在。
   worker 的自動部署可能失敗或未觸發 → 跑舊 image ＝ 公告不推）。
2. worker 未在運作（free 方案休眠/崩潰）→ 則站內通知也不會產生（鈴鐺可驗）。
3. 首次測試時 worker 尚在部署（事件已標 DISPATCHED，不會補推）。

**下一步診斷（兩個一分鐘檢查，可直接定位）**
- **A 看鈴鐺**：有該則公告通知 → 事件流程正常，問題僅在推播段；無 → worker 沒在處理事件。
- **B 核准一筆請假**（刀5 之前就會推播的功能）：收到 LINE → worker 活著但跑舊程式（＝原因 1）；
  沒收到 → worker 整個沒運作（＝原因 2）。
- **最可能的修法**：Render → `sproutin-worker` → Manual Deploy → Deploy latest commit → 再發一則全校公告。
- 仍無 → 查 Render `sproutin-worker` log：有無 `[worker] dispatched event=AnnouncementPublished`、
  有無 `line-push` job 失敗、LINE API 回應碼（token 未設會靜默略過）。



**MVP 缺口 #10 學生整合視圖**
- 後端 `GET /students/:id/detail`：在既有 `/students/:id` 的授權鏈（ScopeGuard）與敏感 READ 稽核之上，
  多帶「班名 + 監護人清單（姓名/關係/是否主要聯絡人）」，讓一頁看完一個孩子的全貌。
- 前端 `/liff/student/[id]`：基本資料 → 本月出缺勤統計 + 最近 5 筆 → 家長/監護人 → 最近請假。
  入口：學生管理清單點姓名。授權完全交給後端（老師只開得了自班、家長只開得了自己小孩）。

**MVP 缺口 #12 公告 LINE 推播**
- `PushNotificationService` 新增 `AnnouncementPublished`：文字 `【全校公告/班級公告】<標題>`;
  對象與站內通知一致（全校→全體;班級→該班老師 + 該班家長）;**公告已刪除（查無標題）→ 不推**。
- **這推翻了 Step 5 當時「只推重點事件、公告不推」的設定**（Human Owner 2026-08-17 同意納入刀5）。
- docs/06 訂閱表同步標註。

**誠實提醒**：全校公告會推給全園所有已綁 LINE 的人。demo 規模無妨，**正式營運需注意 LINE 推播訊息量與費用**
（列入上線前評估;若要更細緻，未來可在園所設定加「公告是否推播」開關）。

Verification：本機 lint ✓ / typecheck ✓ / test ✓（api 179 + shared 10 + web 16 = **205**）/ build ✓。

### 2026-08-17 — Phase 9 階段2 刀3 / 人員帳號與關聯（✅ **ACCEPTED**, Human Owner 2026-08-17;CI ✅ run 31970653250，含 migration 0004 套用 + drift 檢查）

**migration 0004_user_status（expand-only，ADR-003）**：`User.status`（enum `UserStatus` ACTIVE|INACTIVE，預設 ACTIVE）。
既有列自動 ACTIVE，線上零風險。**這是階段2 唯一到目前為止的 DB 變更**（Human Owner 事前已知會）。

**後端（新增 7 端點）**
- `GET /users?role=`、`POST /users`、`PATCH /users/:id`（OWNER/ADMIN;**無 DELETE**）。
  `UserView` 一次帶回角色、綁定的小孩、任教班級、是否已綁 LINE —— 管理介面不必多打好幾支 API。
- `POST/DELETE /guardianships`（家長↔學生）、`POST/DELETE /teacher-assignments`（老師↔班級）。
- **停用即不能登入**：`AuthService` 於 `login` 與 `/me` 兩處擋（既有 JWT 於下次載入失效）。
- **最後一位在職園長不得停用** → 400 `last_owner_cannot_be_disabled`（否則園所無人可管理）。
- **UserRole 一律建 SCHOOL scope**：班級層級授權的真正依據是 `TeacherAssignment`（ScopeResolver 實測確認 `UserRole.scopeId` 未被任何授權路徑讀取），避免班級歸屬存兩份而不同步。
- 全部寫入與 AuditLog 同交易;**metadata 不存姓名**（PII），只記角色/對象 id。

**前端**
- `/liff/admin/people`：新增人員（老師/隨車老師/行政/家長/監護人）、分頁篩選（全部/教職員/家長）、
  「未綁定」標記;編輯面板＝改名、停用/啟用、**家長綁小孩（含關係）**、**老師排班級**，含解除。
- 「我的」→ 園所管理 擴為四個入口。proxy routes 6 支。

**誠實提醒**：① 園長（OWNER）不從此頁新增——交接園長屬敏感操作，demo 先不開放。② 停用只在「下次載入」生效，
既有 API 呼叫在 JWT 效期內仍可用;完整即時撤銷屬上線前項目。③ 新建帳號**尚未綁定 LINE 前本人無法登入**（綁定機制為開賣前必要項）。

Verification：本機 lint ✓ / typecheck ✓ / test ✓（api 176 + shared 10 + web 16 = **202**）/ build ✓。
待 push → CI（db job 會套用 0004 並做 drift 檢查）→ Render preDeploy migrate → 線上驗收。

### 2026-08-17 — Phase 9 階段2 刀2 / 班級 + 學生管理（✅ **ACCEPTED**, Human Owner 2026-08-17）

**後端（新增 5 端點，零 migration）**
- `POST /classes`、`PATCH /classes/:id`、`DELETE /classes/:id`（OWNER/ADMIN）。班名園內唯一（重複 409）;
  **刪除僅限無學生且無老師編制**（否則 409 `class_has_students` / `class_has_teachers`）。`GET /classes` 回傳加 `studentCount`。
- `POST /students`、`PATCH /students/:id`（OWNER/ADMIN）。`GET /students?classId=` 新增清單端點——
  **classId 只縮小不放寬**（家長帶別班 id 仍看不到他人小孩，已有測試鎖住）。
- **無學生 DELETE**：離校/畢業改 `status`（只停用不刪除，Human Owner 決策）。
- 全部寫入與 AuditLog 同交易;**metadata 不含學生姓名**（PII，修正 C），換班另記 `fromClassId`/`toClassId`。
- ClassesService / StudentsService 加入 AuditService;各自 module 補 `AuditModule` import（原先靠 AuthModule re-export，改為顯式）。

**前端**
- `/liff/admin/classes`：新增、改名、刪除（有學生時刪除鈕停用 + 說明原因，409 錯誤翻成白話）。
- `/liff/admin/students`：依班級篩選、新增（姓名 + 班級）、編輯（改名 / 換班 / 在學狀態）。無班級時導去先建班級。
- 「我的」→ 園所管理 擴為三個入口（園所外觀 / 班級管理 / 學生管理）。
- proxy：`/api/students`(GET,POST)、`/api/students/[id]`(PATCH)、`/api/classes`(+POST)、`/api/classes/[id]`(PATCH,DELETE)。

**架構**：無變更、無 migration、無新 library。docs/05 矩陣本就是 Class/Student = OWNER/ADMIN CRUD，未改。

Verification：本機 lint ✓ / typecheck ✓ / test ✓（api 160 + shared 10 + web 16 = **186**）/ build ✓。待 push → CI → 線上驗收。

### 2026-08-17 — Phase 9 階段2 刀1 / 園所外觀設定頁 + 功能藍圖佔位卡（✅ **ACCEPTED**, Human Owner 2026-08-17）

**Human Owner 線上實測全數通過**：圖片上傳（Vercel Blob，公開 store）、娃娃車卡片顯示、顏色與封面套用、卡片開關、卡片排序。→ **刀 1 ACCEPTED**。

**延後項（Human Owner：之後按需求再改）**：封面圖目前掛在全站外框（每頁都出現的 128px 橫帶）。選項 A 只在首頁顯示 / B 首頁做成真正的 hero（大圖 + 園名歡迎語疊字）/ C 維持現狀。**尚未決定，暫維持現狀**。



**背景**：階段2 = 後台管理 + 園所裝飾，分 5 刀（1 外觀設定 → 2 班級/學生 → 3 人員帳號與關聯 → 4 每日聯絡簿 → 5 學生整合視圖 + 公告推播）。本次為**刀 1**。
**Human Owner 決策（2026-08-17）**：① 後台放在同一個 App（`/liff/admin/*`）② 圖片上傳採 **Vercel Blob**（新 infra，已核准）③ 園所外觀**放寬 ADMIN 可改**（docs/05 矩陣同步修改）④ 資料只停用不刪除 ⑤ LINE 綁定碼機制延後至開賣前（已列上線前提醒）⑥ **卡片是否顯示於家長頁由園所自己在後台決定**。
**產品原則（Human Owner）**：這是朝完整專案前進的系統，只是不必等完整才展示；未完工的功能不具備完整功能，但**必須讓人知道接下來會有** → 佔位卡連到「功能預告頁」，不是點不下去的死角。

**後端（新增 2 端點，§D 已定案）**
- `apps/api/src/school/`：`GET /school/config`（讀可編輯欄位）、`PATCH /school/config`（局部更新，未知欄位 400）。`@Roles('OWNER','ADMIN')`;寫入與 `AuditLog` 同一 transaction（`school.config.update`，metadata 只記欄位名不存值）。zod 就地驗證（顏色 `#RRGGBB`、圖片限 http(s) 或站內相對路徑、flag key 格式）。
- **零 migration**（SchoolConfig 欄位早已齊備）、無破壞性變更。

**shared**
- `MVP_CARDS` 新增 5 張規劃中卡片（payment/portfolio/forms/calendar/health;transportation 沿用既有）。
- `selectDashboardCards` 旗標語意擴充（**向後相容**）：規劃中功能維持 opt-in（`true` 才顯示）;已上線功能**預設顯示、可被園所明確關閉**（`false` 才隱藏）→ 既有園所 `featureFlags:{}` 零影響。新增 `cardFlagKey()`。
- `SchoolAdminConfig` 型別 + `UpdateSchoolConfigDto`。

**前端**
- `/liff/admin/appearance`（OWNER/ADMIN）：園所名稱、色票（5 組建議色 + 自訂色票選擇器，**編輯中即時套用到整個 App**）、園徽/封面（內建圖庫 4+3 張 SVG、上傳、貼網址、移除）、功能卡片（開關 + 上下移排序）、請假是否需審核;底部固定列顯示「尚未儲存的變更」+ 復原/儲存，只送出 diff。
- `POST /api/uploads/image`（same-origin → Vercel Blob）：先向後端 `/me` 確認 OWNER/ADMIN 才收檔;限 PNG/JPG/WebP、4MB;**不收 SVG**（可內嵌腳本）;未設 `BLOB_READ_WRITE_TOKEN` → 503 `upload_unconfigured`，前端自動改用圖庫/貼網址，不會壞。
- `/liff/soon/[feature]` 功能預告頁（7 則文案：聯絡簿/娃娃車/收費/成長紀錄/表單/行事曆/健康），家長首頁的「即將推出」卡片改為可點入。
- 「我的」新增園所管理入口（僅 OWNER/ADMIN 可見）;`roleFlags.canManageSchool`;`Icon` 新增 heart/cog/image/sparkle;`cards.ts` 改用清葉線性圖示（原 emoji 移除）。
- seed：demo 園所預設開啟全部規劃中旗標（展示完整藍圖）。

**新依賴**：`@vercel/blob`（web dependency;Human Owner 核准的 infra 決策所需）。**新環境變數**：`BLOB_READ_WRITE_TOKEN`（Vercel web 專案;Human Owner 正在建立 Blob Store,未設定不影響其他功能）。

Verification:
- 本機 `pnpm lint` ✓、`pnpm typecheck` ✓、`pnpm test` ✓（api 148 + shared 10 + web 15 = **173**）、`pnpm build` ✓。
- 待：push → CI 全綠 → 線上手機實測（園長改外觀 → 全站即時變樣）。

**線上驗收回饋修正（2026-08-17，Human Owner 實測）**
- **娃娃車開了但首頁沒出現**＝卡片觀眾名單原本不含 OWNER/ADMIN（`transportation` 只給 BUS_TEACHER/PARENT/GUARDIAN），園長自然看不到。修正：① `transportation.requiredRoles` 加入 OWNER/ADMIN（與 payment/health/portfolio 一致）② **設定頁每張卡片標示「給：家長 · 老師 …」，且若目前登入者的身分看不到該卡會明確提示**（`lib/roleLabels.ts`;`me` 頁的角色標籤一併改用共用表）。根因是設定頁只給開關卻沒說觀眾是誰 → UI 資訊不足，非資料錯誤（線上 `featureFlags.bus` 確實為 true）。
- **上傳仍 503**：線上探測顯示 web runtime 取不到 `BLOB_STORE_ID`/`BLOB_READ_WRITE_TOKEN` → Blob Store 已建立但**尚未 Connect to Project**（或連上後未重新部署）。程式無誤。

**誠實提醒**：① 設定頁未開放 `theme`/`dashboardLayout`——目前單一主題（清葉）、首頁已重建不再讀 dashboardLayout，開放會是假選項。② `components/DashboardCard.tsx` 已無人使用（清葉首頁改為內嵌列表）＝ 死碼，待清理。③ `lib/preview.tsx`（sessionStorage 外觀預覽）在單一主題下亦已無作用。

### 2026-08-17 — Phase 9（Demo 設計）/ 「清葉」方向落地 + 家長 App 全面改版（IMPLEMENTED，已上線 demo）

**背景（Human Owner 重新定調）**：Phase 9 目前真正需求＝一套「拿去賣的 demo」（同一套系統、假資料），**非 pilot**。要件：後台管理介面、園所客製/裝飾、**設計大升級**、逐步加功能。設計策略：先把**一套**做到頂（單一主題，園所在其下換品牌/內容；多主題供選列未來擴充，架構 `theme` 欄位已預留）。**選定方向＝清葉（清新自然/editorial）**；warm/professional/grid/list 被否決為不夠格。詳見記憶 `sproutin-phase9-redirect-demo-design`。

**已上線（main 直接部署 demo；commit 2e7c291 / a0f3f9f / 329a4d8 …）**：
- **設計系統核心**：`globals.css` / `theme.ts` / `tailwind.config` → 清葉 token（米白 `#f4f2ea` 底、森綠 `#2f6b4f`、襯線標題、細線、柔和留白）+ `font-sans/serif`。主題單一：`warm/professional` 一律映射清葉；品牌色（`--brand-*`）仍 per-school 疊（ADR-001 不變）。
- **家長 App 改版**：`Icon` 元件（清葉線性圖示集）；首頁 `/liff` 重建（襯線問候 + 學生切換 + 今日到校狀態 + 本月統計〔接真實 attendance〕+ 快速功能細線清單 + 最新公告〔接真實 announcements〕）；`AppShell` 清爽頁首 + **底部頁籤**（首頁/聯絡簿/通知/我的）；新增 `/liff/me`；請假表單（類別 chips + 細線輸入 + 森綠送出）；聯絡簿訊息（清葉氣泡 + 日期分隔 + pill 輸入 + 圓形送出）；出缺勤/公告/通知清單精修；`PageHeader` 襯線 + 圓框返回。
- **老師/園長面板**：沿用 `.card`/`.section-title`（已襯線）/`.btn`（清葉），自動轉清葉，無結構改動。

**架構**：無變更。無新 migration、無新 library、無新 infra。純前端設計系統 + 頁面重建。build/lint/CI 綠。

**待辦 / 誠實提醒**：① 園所裝飾/後台管理目前只是**互動樣板**（artifact），尚非 App 真頁面 → 下一大階段。② 襯線中文在部分 Android 無內建襯線字時會退黑體（未內嵌字型，之後評估）。③「到校時間 08:12 / 老師留言」欄位資料庫未建模，首頁先示意。④ 尚未逐頁精修：稽核頁。

### 2026-08-16 — Phase 8 / 溫暖親和全站鋪開 + per-school 版型/主題模板後端（IMPLEMENTED）

**設計全站鋪開**：globals `@layer components`（card/field/btn-primary/btn-secondary/field-label/section-title/chip）;所有內頁與元件（leave/attendance/message/notification/announcement/audit + teacher/school 面板 + PageHeader/StudentSelect/ClassSelect）改暖色 tokens + 圓角卡片 + pill 按鈕 + 訊息氣泡。冷灰全換暖色中性。

**per-school 版型/主題模板（Human Owner §D 定案:主題+版型都做,先各 2 套）**：
- **migration 0003**（expand,ADR-003）:SchoolConfig 加 `theme`（warm|professional,預設 warm）+ `dashboardLayout`（grid|list,預設 grid）;既有列自動取預設,零風險。
- shared `PublicConfig` +theme/+dashboardLayout;`public-config.service` + web `/api/public-config` fallback 都補。
- 前端 `lib/theme.ts`（warm/professional 兩組暖色中性 CSS 變數 bundle）;`BrandingProvider` 依 config.theme 套一組 + 疊品牌色;Dashboard 依 `dashboardLayout` 切 grid(雙欄)/list(單欄橫列);`DashboardCard` 加 variant。
- 換一間園只要改該校 SchoolConfig.theme/dashboardLayout（+色/logo/banner）即不同樣貌,zero 改版。

Verification:
- 本機 lint/typecheck/test(158)/build 綠;db:generate 過。
- 待:push → CI（db job 套 0003 + drift 檢查）→ Render preDeploy 套 0003 → Human 手機實測。

Next:
- Phase 8 收尾。之後 Phase 9 Pilot（先計畫）。

### 2026-08-16 — Phase 8 / 登入持久化（httpOnly cookie session）+ 溫暖親和設計 proof（IMPLEMENTED）

**溫暖親和設計方向**：Human Owner 反映線上太陽春 → 定「溫暖親和」（圓角/暖色/柔和陰影/留白）。已上線 Dashboard + 外框 proof（globals 暖色 tokens、AppShell 漸層頁首、卡片 hover/stagger 進場）;方向確認 OK → 待全站鋪開內頁 + §D 版型/主題模板後端。

**登入持久化（業界標準 httpOnly cookie;先做 pilot 痛點）**：
- 問題：Sproutin JWT 只存記憶體 → 重整就沒 → 每次重走登入;LIFF idToken 過期會強制跳 LINE。
- 解法（same-origin 層，後端 Bearer 介面不變）：`/api/auth/line/login` 換發後**設 httpOnly cookie `sp_session`**（7d,對齊 JWT）;`proxyToApi` 從 cookie 注入 Bearer;`/me`、`/me/students` 改走 proxy;新增 `/api/auth/logout`。前端 `apiGet/apiSend` 去 token 參數（cookie 自動帶）;`SessionProvider` **先試 /me（cookie），有效就完全不碰 LINE**，401 才走 LIFF;`useSession` 只提供 user;AppShell footer 加「登出」。
- 效果：7 天內重開/重整**不再跳 LINE 登入**;cookie httpOnly（防 XSS）。
- Verification：本機 lint/typecheck/test(158)/build 綠;待 push→CI→Human 手機實測（重開不跳 LINE、登出鈕可清）。

### 2026-08-16 — Phase 8 / P5 demo 資料收尾（IMPLEMENTED）

Completed:
- seed 的「園長單帳號自測推播」fixture（`user-owner` 加 ADMIN + 監護 `stu-sun-2`）改為 **opt-in**：僅 `SEED_PUSH_DEMO=true` 時建立。標準 `pnpm db:seed`（含 CI db job）不再給園長 admin/監護 → canonical/正式 seed 乾淨。
- 現有線上 dev DB 既有的那兩列**無害保留**（upsert 不刪;正式部署為 fresh DB,不設旗標即乾淨）。要再測推播 → `SEED_PUSH_DEMO=true pnpm db:seed`。
- verify.ts 不需改（斷言針對 user-parent/stu-sun-1,未觸及）。

Verification:
- seed type-scan ✓;CI db job（無 SEED_PUSH_DEMO）→ 不建 P5 列、verify 不受影響。
- 待:push → CI 綠。

Next:
- Phase 8 #6 append-only DB 層鎖死 —— **以 06 §D 格式提案,停下等 Human Owner 定案**（infra/ADR-003 破壞性:新 app role + 新 secret + 換連線）。

### 2026-08-16 — Phase 8 / hardening（web 安全標頭 + 隔離/secret/錯誤檢視）（PARTIAL）

Completed:
- **web 安全標頭**（`next.config.mjs` `headers()`,全路徑）:`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy: camera=(),microphone=(),geolocation=()`、`Strict-Transport-Security`（HSTS）。
- **檢視/確認（無新程式）**:錯誤處理已由全域 exception filter 涵蓋;多校隔離為架構性（DB-per-school、單 instance 單校,ADR-006）;secret exposure —`/config/public` 為 PublicConfig 型別無機密、`API_INTERNAL_URL` server-only（ADR-001）。
- **刻意不做（列後續,需裝置實測/決策）**:CSP + X-Frame-Options（LIFF 於 LINE webview,貿然設定易擋登入）;rate limiting（同源 proxy 後 API 只見 Vercel IP,IP 限流會誤傷全體,宜在 edge/Next proxy 層做）。

Verification:
- 本機:`pnpm build`✓（next.config headers 有效）;lint/typecheck/test 不受影響。
- 待:push → CI 綠 → 線上 curl 驗標頭生效。

Next:
- Phase 8 #5 P5 demo 資料收尾 → #6 append-only DB 鎖死（§D 提案,停下等 Human Owner 定案）。

### 2026-08-16 — Phase 8 / web 前端元件測試（Vitest + RTL）（IMPLEMENTED）

Completed:
- 導入 **Vitest + React Testing Library**（web 原本無測試層）:`vitest.config.ts`（jsdom + @vitejs/plugin-react）、`src/test/setup.ts`（RTL afterEach cleanup;因 globals:false 需手動註冊）;web `test`=`vitest run`（turbo `test` 自動涵蓋）。
- 測試:`lib/roles.spec.ts`（roleFlags 5 例——家長/老師/園長/多重身份聯集/無角色,鎖住 UI 權限旗標對齊後端矩陣）、`components/StatusScreen.spec.tsx`（RTL 3 例）。web 共 8 tests。
- deps（web devDeps）:vitest、@vitejs/plugin-react、@testing-library/react、@testing-library/dom、jsdom。

Verification:
- 本機:`pnpm lint`✓、`pnpm typecheck`✓、`pnpm test`✓（api 142 + shared 8 + web 8 = **158**）、`pnpm build`✓。
- 待:push → CI 全綠。

Next:
- Phase 8 #4 多校隔離 / secret / 效能 hardening。

### 2026-08-16 — Phase 8 / 全域 exception filter（IMPLEMENTED）

Completed:
- `core/http/all-exceptions.filter.ts`（`@Catch()` 全域,APP_FILTER 註冊）:所有錯誤統一 `{ success:false, error:{ code, message } }`。HttpException 沿用狀態碼 + 訊息碼（out_of_scope / LEAVE_INVALID_TRANSITION / missing_token…）;未預期錯誤 → 500 通用 `INTERNAL_ERROR`,**stack 只進 server log、不外洩**。成功回應維持原樣（不包裝,避免破壞既有前端）。
- 前端 `lib/api.ts` `toApiError` 改讀信封 `error.code`（保留舊 `message` 形狀回退,如 proxy 503）;既有 leave/通用錯誤中文對映不受影響。
- e2e 409 斷言改為新信封;+ filter 單元測試（403/409/400/500 不洩漏）。api 測試 138→142。

Verification:
- 本機:`pnpm lint` ✓、`pnpm typecheck` ✓、`pnpm test` ✓（api 142 + shared 8 = 150）、`pnpm build` ✓。
- 待:push → CI 全綠。

Next:
- Phase 8 #3 web 元件測試（vitest/RTL）。

### 2026-08-16 — Phase 8 / ESLint flat config（IMPLEMENTED）

Completed（Human Owner 指示先做;清 tech debt「ESLint flat config」）:
- 建 root `eslint.config.mjs`（ESLint 9 flat）：js + typescript-eslint recommended;web 另加 react-hooks + `@next/eslint-plugin-next`;測試檔加 jest 全域;忽略 dist/.next/coverage/config 檔/prisma 腳本。
- 規則微調:`no-unused-vars` 忽略 `^_`（既有 mock/解構慣例）;`no-console: error`（entrypoint main/worker 已就地 disable,符合 coding-style）。
- deps（root devDeps）:`eslint@9`、`@eslint/js`、`typescript-eslint@8`、`eslint-plugin-react-hooks@5`、`@next/eslint-plugin-next@15`、`globals`。
- lint scripts:api/web/shared 皆 `eslint src`（web 由 `next lint` 改為直接 eslint,flat config)。CI `build` job 加 `pnpm lint` gate（移除舊 TODO）。
- **踩雷修正**:`@next/eslint-plugin-next@14` 用了 ESLint 9 已移除的 `context.getAncestors` → 崩潰;升 `@15` 解決（plugin 獨立於 next runtime 版本）。

Verification:
- 本機 `pnpm lint` ✓（api/web/shared 全綠,0 error 0 warning）。typecheck/test/build 不受影響（僅設定 + script + devDeps 變更,無 src 邏輯改動）。
- 待:push → CI（新增 lint gate）全綠。

Next:
- 與 Human Owner 排 Phase 8 後續優先序（append-only §D / 全域 exception filter / web 元件測試 / 多校隔離·secret·效能 / P5 demo 收尾）。

### 2026-08-16 — Phase 7 — Core MVP ✅ COMPLETE（Human Owner）

Completed:
- Human Owner 確認 **Phase 7 COMPLETE**。Step 1–7 全數 ACCEPTED。
- **Step 5 LINE 推播線上實測通過**:seed demo 讓園長單帳號自測（+ADMIN +監護 stu-sun-2）→ 申請范小陽請假 → 核准 → 手機收到 LINE 推播。過程修:① worker 未吃到 token（需重新部署）② 請假「申請區」原只給家長角色 → 改 `canApplyLeave`（家長/行政/老師,對齊 docs/05）③ seed 改為 re-run 安全（未帶 `DEMO_OWNER_LINE_USER_ID` 重跑不覆寫園長既有 LINE 對映）。
- **Polish**:LINE 推播文字帶學生姓名（`push-notification.service`,查無回退「學生」）;通知鈴鐺顯示到秒 + 本地時區（`NotificationList`）。
- CI 全綠;Production 部署;LINE 推播線上收到（帶姓名）。

Tech Debt / Phase 8 候選:
- **P5 demo hack**:seed 給 `user-owner` 加 ADMIN + 監護 stu-sun-2（單帳號自測推播用）。正式前評估移除或改獨立測試帳號。
- ESLint flat config（CI 仍略過 lint）;append-only DB 層鎖死（§D）;全域 exception filter 統一信封;web 前端元件測試（目前無）;多校隔離/secret/效能 hardening。

Next:
- Phase 8 — Integration / Hardening（新 session;先計畫 → 確認 → 實作）。

### 2026-08-16 — Phase 7 / Step 5 — LINE 推播線上實測前置（seed demo 啟用單帳號自測）

Completed:
- Human Owner 完成 P5 前置:Render `sproutin-worker` 填 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`、Login/Messaging 同 Provider、收播手機加 OA 好友。
- **問題**:線上僅園長帳號綁真 LINE,而園長非任何推播收件人（核准→家長、訊息→家長+老師）→ 無法直接測到推播。
- **解法（Human Owner 選 A：單帳號自測）**:`seed.ts` 給 `user-owner` 額外 **ADMIN 角色**（可核准請假）+ **監護 `stu-sun-2`（范小陽,無其他監護人）**。核准請假不排除操作者 → 園長核准范小陽的請假 → 園長手機收到 LINE 推播,且無雜訊（該生無其他家長）。純 demo 資料（SEED_DEMO 保護）;**verify.ts 不需改**（其斷言針對 user-parent / stu-sun-1,未觸及）。
- 待:push → Human Owner 於 Render **重跑 seed job**（`pnpm db:seed`,`SEED_DEMO=true`）→ 依實測腳本自測推播 → Step 5 acceptance。

### 2026-08-16 — Phase 7 / Step 7d — 園長/ADMIN 全校視角 + 稽核查詢頁（IMPLEMENTED）

Completed（Human Owner 決策:稽核頁 + 全校公告 + 全校待審總覽;7a–7c 手機實測 ACCEPTED）:
- **後端**:`LeavesService.listForSchool`（OWNER/ADMIN 全校待審,service 內授權）+ `LeavesController` 無 studentId/classId → 全校分支;+2 單元測試（api 138）。稽核端點 `GET /audit-logs`（Step 6 已備,直接沿用）。**無 migration、無新 library。**
- **稽核查詢頁**（`/liff/audit`,OWNER/ADMIN）:`features/audit`（`useAuditLogs` 信封回應 + `keepPreviousData` 換頁不閃）;篩選 資源類型/操作者/日期區間 + 分頁（limit 50 + 上一頁/下一頁）;result 標籤（成功/失敗/拒絕）;proxy `/api/audit-logs`;頁面 role gate（非 OWNER/ADMIN → 提示無權限）。
- **全校公告**:`TeacherAnnouncePanel` 加「全校/班級」範圍選擇（OWNER/ADMIN 可選 SCHOOL;老師固定 CLASS）;沿用既有 `POST /announcements`。
- **全校待審請假總覽**:`SchoolLeaveOverviewPanel`（`useSchoolPendingLeaves` → `/api/leaves?status=PENDING`）;OWNER 唯讀、ADMIN 可核准/駁回。併入 `/liff/leave`:OWNER/ADMIN 顯示全校總覽（取代班級面板避免重複）、純老師顯示班級審核、家長顯示申請。
- **Dashboard**:`shared.MVP_CARDS` 加 `audit` 卡（requiredRoles OWNER/ADMIN;+單元測試,shared 8）;`cardMeta` audit → `/liff/audit`。`lib/roles` 加 `canAnnounceSchool`/`canViewSchoolLeaves`/`canViewAudit`（皆 OWNER/ADMIN）。

Verification:
- 本機:`pnpm typecheck` ✓;`pnpm test` ✓（api 138 + shared 8 = 146）;`pnpm build` ✓（新增 `/liff/audit`、`/api/audit-logs`）。
- 待:push → CI 綠 → Vercel Preview → **Human Owner 手機實測（園長帳號）**。

Architecture:
- **無變更**。全校待審為既有 `GET /leaves` 的唯讀擴充;稽核沿用 Step 6 端點;無 migration、無新 library。多重身份沿用聯集視圖。

Human Owner:
- NOW:確認是否 commit + push 7d。push + 驗收 → **Phase 7 完成**。

Next:
- 7d acceptance → **Phase 7 COMPLETE**。之後:Phase 8（Integration/Hardening;含 ESLint tech debt、append-only DB 鎖死 §D、Step 5 LINE 推播線上實測前置）—— 先計畫 → 確認。

### 2026-08-16 — Phase 7 / Step 7c — 老師端 + 兩支輕量後端端點（IMPLEMENTED）

Completed（Human Owner 決策:補後端 + 一次做完四項）:
- **後端（新增，皆唯讀 scope 過濾;非新架構/library,無 migration）**:
  - `ScopeResolver.canManageClass(userId, roles, classId)`（OWNER/ADMIN 全校;TEACHER/BUS_TEACHER 自班）。
  - `GET /classes`（`classes/**`:ClassesService/Controller/Module）:OWNER/ADMIN 全校、TEACHER 自班（+班名）;`@Roles` 限 staff。
  - `GET /leaves?classId=&status=`（`LeavesService.listForClass` + controller 分支）:整班待審清單,`canManageClass` 授權。
  - 測試 +10（classes.service 3、canManageClass 4、listForClass 3）→ api 共 **136**;`app.module.spec` DI smoke 自動涵蓋 ClassesModule。
- **前端（沿用 7a 地基,聯集視圖）**:
  - proxy:`/api/classes`、`/api/leaves/[id]/status`、`/api/attendance`(POST)+`/api/attendance/[id]`(PATCH)、`/api/announcements`(POST)。
  - `lib/roles`（角色旗標:isGuardian/canReviewLeave/canMarkAttendance/canAnnounce,對齊後端 @Roles,避免顯示會 403 的面板）。
  - `features/classes`（`useMyClasses`/`useSelectedClass`）+ `ClassSelect`。
  - 審核請假:`TeacherLeaveReviewPanel`（班級待審 → 核准/駁回,學生名以 useMyStudents 對映）+ hooks `useClassPendingLeaves`/`useSetLeaveStatus`。
  - 點名:`TeacherRosterPanel`（班+日 → 逐生狀態鈕;新標記 POST / 改狀態 PATCH）+ hooks `useClassAttendance`/`useMarkAttendance`。
  - 班級公告:`TeacherAnnouncePanel`（班+標題+內容 → POST scope=CLASS）+ `useCreateAnnouncement`。
  - 班級訊息:重用 7b `MessageThread`（老師從自班學生選）。
  - 頁面 role-gated 併入:`/liff/leave`（審核+家長申請）、`/liff/attendance`（點名+查看,查看對任何有學生者顯示,修正不因角色遺漏園長/行政讀取）、`/liff/announcement`（發布+清單）。

Verification:
- 本機:`pnpm typecheck` ✓;`pnpm test` ✓（api 136 + shared 7 = 143）;`pnpm build` ✓（新增 `/api/classes`、`/api/leaves/[id]/status`、`/api/attendance/[id]` 等路由）。
- 待:push → CI 綠 → Vercel Preview → **Human Owner 手機實測（老師帳號）**。

Architecture:
- **無變更**。新增後端唯讀端點屬既有 domain 邊界內（契約本列 GET /classes）;無新 migration、無新 library。多重身份沿用聯集視圖。

Human Owner:
- NOW:確認是否 commit + push 7c（push main 觸發 Vercel/Render）。老師端手機實測需一個對映到 seed 老師 User 的 LINE 帳號（同家長前置的 A 做法）。

Next:
- 7c acceptance → 7d（園長/ADMIN:全校視角 + 稽核查詢頁 GET /audit-logs）。

### 2026-08-16 — Phase 7 / Step 7b — 家長其餘四張卡片（IMPLEMENTED）

Completed（沿用 7a 地基,無新 library、無架構變更、無 migration）:
- **出缺勤**（唯讀,依日期清單 — Human Owner 決策）:proxy `/api/attendance`、`features/attendance`（`useAttendance` / `AttendanceList` / 狀態標籤 出席·缺席·請假·遲到）、`/liff/attendance`。
- **訊息**（雙向）:proxy `/api/messages`(+`/[id]/read`)、`features/message`（`useMessages`/`useSendMessage`/`useMarkMessageRead`、`MessageThread` 自己靠右/校方靠左 + 未讀可點標已讀 + 底部發訊）、`/liff/message`。
- **通知**:proxy `/api/notifications`(+`/[id]/read`)、`features/notification`（`useNotifications`/`useMarkNotificationRead`、`NotificationList` 未讀點 + 標已讀、type→中文標籤含 fallback）、`/liff/notification`;入口為 `AppShell` 頁首 🔔（通知非 MVP_CARD,採頁首鈴鐺,符合慣例）。
- **公告**（唯讀）:proxy `/api/announcements`、`features/announcement`（`useAnnouncements`/`AnnouncementList` 全校/班級標籤）、`/liff/announcement`。
- **共用抽出**:`useSelectedStudent`（載入可查看學生 + 預設第一位）+ `StudentSelect` + `PageHeader`;leave 頁一併重構沿用（DRY）。Dashboard `CARD_META` 啟用 attendance/message/announcement（leave 已啟用;communication-book/transportation 仍「即將推出」）。`lib/api` 加通用 `apiErrorMessage`。

Verification:
- 本機:`pnpm typecheck` ✓;`pnpm test` ✓（api 126 + shared 7 = 133,7b 為 UI 未加測試）;`pnpm build` ✓（新增 5 個 `/liff/*` 頁 + 6 條 proxy;各頁 First Load JS 137–141kB,符合預算）。
- 待:push → CI 綠 → Vercel Preview → **Human Owner 手機實測**（家長全貌:四張卡 + 通知鈴鐺）。

Architecture:
- **無變更**。無新 migration、無新 library;全部消費 Step 1–4 既有端點（授權仍在後端 Guard,前端只呈現）。多重身份沿用聯集視圖。

Human Owner:
- NOW:確認是否 commit + push 7b（push main 觸發 Vercel/Render）。

Next:
- 7b acceptance → 7c（老師端:審核請假/點名/班級訊息·公告）。

### 2026-08-16 — Phase 7 / Step 7a — 前端地基 + 家長請假端到端（IMPLEMENTED）

Completed:
- **設計決策定案（Human Owner 拍板）**:切子步驟先家長→老師→園長;UI=Tailwind + 少量自建元件（§D 核准）;資料抓取=TanStack Query（§D 核准）;品牌=顏色+logo+banner;版型風格模板留下一版。多重身份（同帳號兼多角色）確認**架構本就支援**（`User.roles[]` 多筆 + `Guardianship` + docs/05 §5），前端採**聯集視圖**（不需改 schema）。
- **前端地基**:`apps/web` 導入 Tailwind（`tailwind.config.ts`/`postcss.config.js`/`globals.css`,品牌色以 CSS 變數承載）+ TanStack Query（`providers.tsx`）;`next.config.mjs` 加 `extensionAlias`（讓 webpack 解析 shared 的 NodeNext `.js` 匯入,因 dashboard 首次匯入 shared 的 **runtime 值**）。
- **runtime 品牌**（ADR-001）:`BrandingProvider` 讀 `/api/public-config` 把 primary/secondary 灌成 CSS 變數、logo/banner 上 `AppShell` 頁首;bundle 零 per-school 值。
- **session + 外框**:`SessionProvider`（LIFF 登入→Sproutin JWT,沿用 Phase 6 `lib/liff`/`lib/auth`）、`StatusScreen`、`AppShell`;`/liff/layout.tsx` 串起 config→品牌→登入→外框。
- **config-driven 卡片牆**:`shared` 新增純函式 `selectDashboardCards`（角色聯集 + featureFlags + cardOrder,附 7 個單元測試）;`/liff` Dashboard 依此渲染,未實作功能顯示「即將推出」。
- **家長請假端到端**:same-origin proxy `/api/leaves`（+`/[id]/cancel`,通用 `proxyToApi` helper）;`features/leave`（`LeaveForm` 申請 / `LeaveList` 查詢+取消 / TanStack hooks / 狀態標籤 + 錯誤碼轉中文）;`/liff/leave` 頁（多小孩選擇器）。授權仍全在後端（卡片/頁面只呈現）。
- **新技術決策（§D 已核准/衍生）**:web deps `@tanstack/react-query`、`tailwindcss`/`postcss`/`autoprefixer`;shared devDeps `jest`/`ts-jest`/`@types/jest`（放純邏輯的單元測試,比照 api）。

Verification:
- 本機:`pnpm typecheck` ✓;`pnpm test` ✓（api 126 + shared 7 = 133）;`pnpm build` ✓（`/liff`、`/liff/leave`、`/api/leaves`、`/api/leaves/[id]/cancel` 皆產出;First Load JS 151/140kB,符合 app-page 預算）。
- 待:push → CI 綠 → Vercel Preview → **Human Owner 手機實測**（程式無法自證手機畫面）。

Architecture:
- **無變更**。無新 migration（Branding/flags/cardOrder 欄位皆已在 `0001_init` / SchoolConfig）;品牌與卡片走既有 `/config/public`（ADR-001）;多重身份沿用既有 RBAC（docs/05 §5）。版型風格模板（需 SchoolConfig 新欄位）依 Human Owner 決策留下一版 §D。

Human Owner:
- NOW:① 確認是否 commit + push（push main 觸發 Vercel/Render 自動部署）② 家長手機實測前置二選一（A 對映 LINE 帳號到 seed 家長 User / B 先用園長帳號驗品牌+版面）。

Next:
- 7a acceptance → 7b（家長其餘卡片:出缺勤/訊息/通知/公告）。

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
