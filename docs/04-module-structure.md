# 04 — Module Structure (Revised)

## 1. Backend (NestJS Modular Monolith, §12)

模組按 **domain** 切。跨模組**禁止直接 import 對方 service**，只能透過①事件 或 ②明確 public interface。

```text
apps/api/src/
├── main.ts
├── app.module.ts
├── core/
│   ├── config/           SchoolConfig loader + GET /config/public（公開 runtime config，ADR-001）
│   ├── event-bus/        in-process EventEmitter2
│   ├── outbox/           Transactional Outbox（寫入端）
│   ├── audit/            AuditInterceptor + AuditService（append-only，修正 C）
│   ├── prisma/           PrismaService（DATABASE_URL 注入）
│   └── redis/            Redis / BullMQ 連線
├── auth/                 LINE Login → JWT；rbac (RolesGuard, ScopeGuard)
├── school/ class/ user/ student/ parent/ teacher/
└── attendance/ leave/ message/ announcement/ notification/
```

> **修正 B**：**移除** 先前規劃的 `_reserved/` 空 module 群（health/bus/report/ai/subscription/payment）。未來模組不預建空殼，改由「Event 訂閱點 + Feature Flag + 文件化 Domain Boundary」保留擴充能力。需要時才以獨立 module 加入。

每個 domain module 內部：
```text
<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts    掛 @Roles / @Scope guard
├── <domain>.service.ts       business logic（不在 UI，Rule 4）
├── <domain>.repository.ts    Prisma 存取
├── events/                   發出/訂閱事件
└── dto/                      Zod schema（與 packages/shared 共用）
```

## 2. Worker（獨立部署單元，對應部署修正）

Outbox dispatcher 與 BullMQ processor 可打包為**獨立 Worker container**（與 API 共用 codebase，不同進入點）：

```text
apps/api/src/worker.ts   → 只跑 Outbox dispatcher + BullMQ processors（LINE push、通知）
```

同一份 build artifact，API 與 Worker 各自以不同 entrypoint 啟動 (§20)。

## 3. Frontend (Next.js, §7–8)

按 **feature** 切。

```text
apps/web/src/
├── app/                  App Router · LIFF 進入點
│   └── api/public-config/  Route Handler：請求期讀 env → 取 /config/public（ADR-001）
├── features/             dashboard/ leave/ attendance/ message/ announcement/
├── components/ui/        reusable · design-token 驅動
├── lib/                  liff/ (LINE Login) · api/ (type-safe client) · auth/(僅顯示用)
├── config/               runtime config loader（消費 /api/public-config，無 build-time per-school 值）
└── styles/               design tokens
```

### 時間一律用園所時區（`lib/datetime.ts`，2026-08-19）

Human Owner 回報「系統的時間與台灣時間不符」。兩個病灶：

```text
① 「今天」是 new Date().toISOString().slice(0, 10) —— 那是 UTC 的今天。
   台灣 UTC+8，凌晨 0 點到早上 8 點之間，系統認定的今天是昨天。
   老師七點到園點名、填聯絡簿，正好落在這個區間。
② 時間戳直接切 ISO 字串（createdAt.slice(11, 16)）—— 顯示的是 UTC 時鐘，慢 8 小時。
   稽核紀錄與親師對話都中招。
```

規則：**時間一律以園所所在時區（`Asia/Taipei`）呈現，不看使用者裝置的時區。**
孩子的「今天」是園所的今天 —— 家長出國時看到的也該是園所的日子。
新程式碼一律走 `lib/datetime.ts`（`schoolToday` / `schoolHour` / `formatDate` /
`formatTime` / `formatDateTime` / `formatMonthDay` / `isSameSchoolDay`），
**不要再寫 `toISOString().slice()`、`getHours()`、`toLocaleString()`**。

後端對應的是 `events/day-key.ts` 的 `todayKey()`（台灣的今天 → UTC 午夜 key）。
**儲存慣例沒有改**：日期型欄位仍然存「該日曆日的 UTC 午夜」，改的只是「現在是哪一天」
與「時間怎麼顯示」。動 `dayKey()` 的正規化會改到既有資料的語意，那是另一件事。

### 尺寸與量測值寫在哪（2026-08-18）

**字體大小（`lib/fontScale.ts`）**：家長在手機的「我的」、園所人員在後台左欄下方
（`<FontScaleControl compact />`，2026-08-19 追加）選標準／中／大 —— 同一個元件的兩種密度，
後台欄寬只有 14.5rem，塞不下每個選項的說明。設定一律只記在那支瀏覽器上。實作是改 `html` 的
`font-size`（100% / 112.5% / 125%），不是逐一調整每個 `text-*` —— Tailwind 的字級與間距
全是 rem，所以整頁**等比**放大，版面比例天然不會跑掉。三個後果要記住：

```text
新寫版面時不要用寫死的 px 字級   text-[10px] 不會跟著放大，大小字比例會走鐘。
                                 需要比 text-xs 更小 → 用 text-2xs / 3xs / 4xs（rem）。
px 只留給不該放大的東西          hairline 邊框、裝飾用圓角。凡是「跟著字一起看的」
                                 （圖示大小、預覽框寬高、側欄寬、表格 min-width）一律 rem。
一行塞三個東西的地方要能退讓      放大後最先爆的就是這種。用 flex-wrap 或改成兩行，
                                 不要讓文字被折成怪斷行。
```

設定存在 localStorage（Human Owner 定案：不進資料庫）。首次繪製前由 root layout 的
內嵌腳本套上，否則會先閃一下標準字。存不進去（無痕模式）時 UI **明講**重開會還原。

**手機外框的量測值（`globals.css` 的 `--shell-header-h` / `--shell-main-pt`）**：
首頁 hero 要往上鑽到頁首後面，就得知道頁首多高。這個值**只有一個來源**——
改了 `AppShell` 頁首的 padding 就改這裡，`HomeHero` 不自己再量一次。

**`AppShell` 的頁首**一律 `sticky top-0`；只有 `/liff`（唯一有 hero 的頁）在最頂端時
透明疊在封面圖上，往下捲換回實色。新增頁面不必做任何事 —— 沒有 hero 就是實色。

## 3b. 電腦版與手機版的功能對等（永久原則，Human Owner 2026-08-18）

> **無論從電腦或手機進來，功能都必須是相通的；差別只在操作介面，不在做得到什麼。**

這條原本只寫在階段3 骨架那一刀的定案裡（「同一份程式碼、同一套權限、同一個 DB，差別只有外框」），
沒有被拉出來當成全站原則，結果後來新做的頁面各做各的。現在明文化：

```text
功能寫成共用元件      features/<domain>/<Panel>.tsx        ← 真正的內容與行為
桌面外框              app/admin/(app)/<x>/page.tsx         ← 標題 + 版面，不含業務邏輯
手機外框              app/liff/<x>/page.tsx（或 /liff/admin/<x>）
```

新頁面**兩個外框一起做**（成本是多一個十行的 page.tsx）。

娃娃車（⑦ 刀1）是第一個照這條原則落地的功能：`features/bus/BusSettingsPanel.tsx`
同時被 `/admin/bus` 與 `/liff/admin/bus` 使用。

**既有的不對等已於 2026-08-18 全數補齊**（批1–批3，見 docs/project/08）。
`lib/adminNav.spec.ts` 有一條測試釘住「導覽上不該再出現指向 `/liff/*` 的項目」——
有人加了只有手機版的頁面時它會失敗。

### 明文例外（Human Owner 2026-08-18 定案）

```text
家長不進電腦版      家長端入口只有 LINE（/admin 對非校方身分顯示引導頁）。
                    因此桌面版的聯絡簿／請假／出缺勤／公告是做給老師與行政用的。
首頁與「我的」      /liff（家長的今日卡片牆）與 /admin（園務數字與待辦）性質不同，
                    /liff/me 同理。這三頁是入口不是功能，不受對等原則約束
                    —— 硬做成一樣，其中一邊一定變難用。
登入與綁定          /admin/login、/admin/bind 是桌面版專屬（手機走 LIFF 自動登入）。
```

除上述之外，**所有功能一律兩邊都要有**。

### 共用元件裡的連結（`lib/surface.ts`）

功能抽成共用元件之後，元件內的連結不能寫死其中一種網址：寫 `/liff/...` 會把桌面使用者
丟進手機版版型，寫 `/admin/...` 會把家長丟到後台登入牆。

作法：共用元件裡的連結一律用 `components/SurfaceLink`，`href` 寫**手機版網址**，
由 `toSurfaceHref()` 依目前所在外框翻譯。還沒搬到桌面的功能會留在手機版，
但自動補上 `?from=admin`（返回鍵才回得了後台，見 `lib/backTarget`）。
功能搬到桌面版時，只要在 `PAIRS` 加一行，全站指向該功能的連結一起跟著改。

同一個檔案的 `isPathWithin()` 也是左側導覽判斷「目前在哪一頁」用的 ——
純 `startsWith` 會讓 `/admin/bus-roster`（點名）把 `/admin/bus`（設定）一起點亮。

反方向的 `toMobileHref()`（桌面 → 手機）讓「一個功能只要寫一次」：
`lib/pageTitle.ts` 的分頁標題對照表只以手機版網址為鍵，桌面版先翻回來再查。

### 共用元件裡的版面密度（`components/SplitColumns`）

功能對等補齊之後出現的第二個問題：內容是從手機版搬過來的，所以在寬螢幕上仍是一長條。

`SplitColumns` 把「要動手做的事」（點名／審核／發布）與「查詢與翻閱」分成兩欄，
**只在桌面外框且兩塊都有內容時**才切；手機外框與只有一塊內容時維持單欄。
判斷同樣用 `surfaceOf(pathname)` —— **不由呼叫端傳 prop**，否則兩個十行的 page.tsx
各要記得傳一次，遲早漏一個。目前用在出缺勤／請假／公告。

> 這是「外框決定密度、共用元件決定內容與權限」的延伸：權限仍然一律寫在共用元件裡。

### 版面的斷句（`components/Band`，Human Owner 2026-08-18 打磨第二階段）

症狀：一頁把好幾個功能區塊用同樣的間距、同樣份量的卡片一路疊下來，
**像一篇沒有標點的文章**；而且多重身分的人（既帶班、小孩也在園裡）看不出
哪一段是「我要做的事」、哪一段是「我孩子的狀況」。聯絡簿對老師來說是連續 8 塊。

```text
<Band kind="action|review|manage" title description? audience?>
  kind      要做的事 / 查看 / 管理。action 與 manage 用粗實線收住，
            review 用細線且卡片收斂一階 —— 份量差別就是斷句本身。
  audience  以老師身分 / 以家長身分。**只有 roleFlags.hasDualIdentity 的人看得到**
            （純家長看到「以家長身分」是廢話，反而變噪音）。
```

**身分籤只貼在結構上必然的區塊。** 例如聯絡簿的「翻閱單一學生」，清單裡同時有
老師帶的班級與他自己的小孩，而 session 的 `AuthUser` **沒有帶 `guardianOf`**
（那只在人員管理的 `UserView` 上）—— 前端判斷不出選到的是不是自己的小孩，
所以那一區不貼籤，改用文案講清楚。要貼得準必須讓 `/me` 多回監護關係，那是後端改動（§D）。

新的 `RoleFlags.hasDualIdentity` = 校方 ∧ 家長。與其他顯示判斷一樣，
`lib/roles.ts` 仍是唯一來源，不要在頁面裡各自判斷一次。

桌面版仍由 `SplitColumns` 左右分欄 —— 那本來就是同一套分法的寬螢幕版本，
`Band` 只是把它帶到手機上，兩邊講的是同一件事。

**Band 與 SplitColumns 的疊法**：出缺勤／請假／公告是用 `SplitColumns` 包 primary／secondary，
`Band` 放在 **primary／secondary 各自裡面** —— 桌面左右分欄、手機上下斷句，兩邊是同一條分界線。
反過來（Band 包 SplitColumns）會變成一個標題底下又切兩欄，斷句反而消失。

目前套上 Band 的頁面：
① 家長／老師每天用的六頁 —— 聯絡簿、娃娃車、出缺勤、請假、公告、學生整合視圖。
② 後台八頁 —— 人員、權限、班級、學生管理、園所外觀（品牌／功能卡片／請假流程／LINE 圖文選單）、
   發送訊息、娃娃車設定、稽核紀錄。

面板自己原本的 `<h2 className="section-title">`／`<p className="eyebrow">` 在進 Band 之後要拿掉
—— 同一段不會有兩個標題。

**後台頁面不貼身分籤。** 那些頁整頁都只有校方進得來（權限判斷在共用元件裡、後端再擋一次），
每一段都掛一次「以老師身分」只是噪音。身分籤要解決的是「同一頁上同時有我要做的事與我孩子的狀況」，
後台沒有這個問題。

kind 在後台的用法：新增／編輯／設定＝`manage`，清單與查詢結果＝`review`，
「現在要發出去的東西」（群發訊息、稽核查詢）＝`action`。

### 兩邊的網址對照

```text
/admin                         /liff                     ← 例外：入口，性質不同
/admin/people                  /liff/admin/people
/admin/roles                   /liff/admin/roles
/admin/messages                /liff/admin/messages
/admin/appearance              /liff/admin/appearance
/admin/bus                     /liff/admin/bus           娃娃車設定
/admin/bus-roster              /liff/bus                 娃娃車點名
/admin/classes                 /liff/admin/classes
/admin/students                /liff/admin/students
/admin/students/[id]           /liff/student/[id]        學生整合視圖
/admin/communication-book      /liff/communication-book  （含 /[studentId]）
/admin/attendance              /liff/attendance
/admin/leave                   /liff/leave
/admin/announcement            /liff/announcement
/admin/notification            /liff/notification
/admin/audit                   /liff/audit
/admin/login、/admin/bind      （無）                     ← 例外：手機走 LIFF 自動登入
（無）                         /liff/me                  ← 例外：入口
（無）                         /liff/soon/[feature]      功能預告頁，只從手機首頁的卡片進
（無）                         /liff/message             舊網址轉址到聯絡簿
```

## 3c. 清葉加厚設計系統（全站改版底層，Human Owner 2026-08-20）

### 為什麼要改

打磨過兩輪之後，Human Owner 的判斷仍是「無論老師或家長，操作起來都要**讀一下**才懂」。
三個根因：

```text
① 聯集視圖失敗    同一頁同時服務老師與家長，靠 Band 貼「要做的事／查看／以老師身分」區分。
                  介面需要貼標籤解釋自己，就是版面已經失敗了。
② 入口用系統的名字 「出缺勤」「聯絡簿」是資料庫的分類；家長腦中是「我小孩今天到了沒」。
                  名字對不上，就得先猜、點進去、發現不對再退出來。
③ 每樣東西一樣重   家長首頁 7 段 6 張同重卡；老師點名 4 顆按鈕同大小，但九成是「到校」。
                  沒有輕重，眼睛就沒有落點。
```

定案：**全頁面重做前端介面**（19 個 `/liff` + 18 個 `/admin`），不動程式架構、API 與權限。
視覺方向＝「清葉加厚」——保留清葉的氣質（米白、森綠、襯線標題、留白），
改的是**份量**：細線改實線、白底改色塊、字級距離拉開。

### 先蓋底層再蓋頁面

一次到位的保險不在畫得多漂亮，在順序：

```text
① token        globals.css + tailwind.config.ts        ← 色、字、形、動
② 元件庫       components/ui/                          ← 15 個，全站只用這些
③ 三套殼       components/shell/                       ← 家長 / 導師 / 行政
④ 四種版型     待辦首頁 / 清單頁 / 詳細頁 / 表單頁
⑤ 逐頁套用     第二批家長 6 頁 → 第三批導師 7 頁 → 第四批行政 18 頁
```

反過來先做頁面的話，任何一次調整都要回頭改 37 次。

### token（`globals.css` 是唯一來源，`tailwind.config.ts` 是它的對照表）

兩份必須一起改。顏色一律指向 CSS 變數而非寫死色碼，園所換品牌色時整站才會跟著換。

```text
中性   --surface-sunk  凹槽（分段選擇器底、統計格、骨架）
       --line-strong   實線＝這一塊可以點；--line 細線＝只是分隔
       --ink-soft      次要字；真正可以淡掉的改用 --ink-mute
                       （2026-08-20 再加深一次，理由見下面「色彩對比」）
品牌   --brand-wash    品牌色 12% 混卡面。用 color-mix 不寫死 —— 園所換色它自己會跟著換
狀態   --good / --wait / --note / --stop，各三個值（wash 底 / edge 邊 / text 字）
形     --radius-tile 20 / --radius-card 16 / --radius-md 12
動     --dur-fast 120ms（按壓）/ --dur-base 220ms（換頁、面板）/ --dur-slow 400ms（進場）
```

**狀態色全園固定，不隨園所品牌變。** 狀態講的是事實（到了沒、准了沒），不是身分；
園所把主色換成紅的，「缺席」還是得是紅的。這組取代散落各處的 `bg-green-100 text-green-800`
——那是 Tailwind 預設色，與米白森綠不同調，而且園所換品牌時不會跟著協調。

**最小字級停在 11px（`text-2xs`）。** 原本的 `3xs`（10px）與 `4xs`（9px）已移除
——家長多半是長輩，那個尺寸在戶外看不見；用到它的地方（底部頁籤、徽章）本來就該大一點。

**可點的東西一律 `min-h-touch`（44px）。**

### 元件庫（`components/ui/`）

15 個。要加第 16 個之前，先確認前 15 個真的湊不出來。

```text
Button      主/次/危險/文字。主要按鈕整頁只准一顆、滿版。危險用 stop 淡底不是實心紅
Tile        待辦磚塊。導師與行政首頁的主體：圖示 + 這是什麼 + 還剩多少 + 數字徽章
StateCard   狀態卡。一頁只准一張，是那句答案。整張用狀態色，遠看顏色就知道結果
Row/Avatar  清單列。頭像 + 名字 + 右邊一顆狀態
Badge       徽章。狀態徽章有邊框（陳述現況）；數字徽章實心（在催人動手，要更跳）
Segmented   分段選擇器。**原生 select 全站退役** —— 三個以內攤開，超過三個改用 Sheet
Field       表單欄位。錯誤貼在欄位下面，不是頁面頂端（頂端的紅字常常已捲出畫面）
Sheet       底部面板。用原生 <dialog>：焦點鎖定、Esc、背景不可點都是瀏覽器內建的
Progress    進度條 + **永遠帶存檔回饋**（老師重複點名的根因就是沒有「存好了」的訊號）
EmptyState  空狀態。寫「今天沒有人請假」不寫「無資料」——後者會讓人以為壞掉了
Skeleton    骨架屏（留在 components/Skeleton，由 ui/index 再出口一次）
ErrorNotice 錯誤。要說怎麼辦，不是只說失敗；有得重試才給重試鈕
AppBar      頁首。家長看到園所識別，校方看到身分鈕
TabBar      底部頁籤。四格上限，第五格開始使用者就要用找的
SectionHead 分段標題。**取代 Band**
```

`components/ui/index.ts` 是新頁面唯一要認得的位置。

### `Band` 退役

`SectionHead` 保留 Band 唯一真正有效的那件事：**用線的粗細分輕重**
（粗線＝要動手，細線＝只是看）。拿掉的是分類籤與身分籤——標題本身講內容
（「今天還有 3 件事」），不再講「要做的事／查看」。身分改由整個殼區分，見下。

> `components/Band` 已於第四批之六刪除（最後兩個呼叫端 `StudentDetail` 與
> `RolesOverview` 換成 `SectionHead`）。同一批一併刪掉的還有 `components/StudentSelect`
> 與 `components/ClassSelect` —— 它們最後的使用者是聯集視圖 `BusView`。

### 三套殼（`components/shell/`）與身分（`lib/persona.ts`）

**身分（persona）＝「看事情的形狀」，不是職稱。**

```text
parent   家長      一個孩子、今天怎麼樣。看的是結果
teacher  班導師    一個班、幾十個孩子、今天還有什麼沒做。做的是重複動作
staff    園長/行政 全園的數字與名單。管的是整體與設定
bus      隨車老師  一條路線的點名。**不給殼** —— 四個頁籤對他是負擔
```

`staff` 與 `teacher` 刻意分開：園長兼導師的人兩個都有，因為「全園今天到幾個」
和「我這班誰還沒點名」不能塞進同一個首頁。
`BUS_TEACHER` 只在沒有其他校方身分時才單獨成立（園長兼隨車的人在自己的殼裡就點得到）。

底部頁籤在 `components/shell/tabs.ts`——**那一份表就是「三種身分」在畫面上的樣子**。
每一格是「一天內會重複去的地方」，不是功能清單。

**多重身分明確切換，絕不混在同一頁**（`PersonaSwitcher`）：切下去頁籤、首頁、
問的問題全部換掉。只有一種身分的人看不到那顆鈕——給他一顆只有一個選項的鈕，
是在暗示他漏掉了什麼。

`lib/usePersona.ts` 的記憶值放在**模組層**而不是各自的 `useState`：頁首的切換器與外框的
頁籤各自呼叫一次 hook，各自 useState 就變成兩份狀態，在切換器裡選了家長、底下頁籤還停在老師
（實際踩過）。記在 localStorage，每次都要用 `resolvePersona` 對照現有角色重驗一遍——
角色被拔掉後還停在舊身分，會卡在一個點什麼都 403 的殼裡。

> `PersonaShell` 尚未接上 `/liff` 的 layout。頁面本身要到第二批才照新版重做，
> 現在就換殼會變成新頁籤配舊頁面，反而更難懂。

### 同一個網址，依身分渲染不同的頁（第二批起）

這是取代「聯集視圖」的作法。舊版把老師要做的事與家長要看的事疊在同一頁，
靠 `Band` 貼標籤區分；現在改成頁面自己問身分：

```tsx
const { persona } = useActivePersona();
return persona === 'parent' ? <ParentLeave /> : <LeaveView />;
```

```text
/liff                     家長＝今天的答案        導師＝今天還有幾件事    行政＝StaffHome（過渡版）
/liff/leave               家長＝申請 + 我的紀錄    導師＝等你決定的申請    行政＝共用 LeaveView
/liff/attendance          家長＝每天紀錄 + 月統計  導師＝今天這一班的點名  行政＝共用 AttendanceView
/liff/communication-book  家長＝我小孩那一本      導師＝今天整班要填的    行政＝共用 CommunicationBookView
/liff/announcement        家長＝只讀列表          校方＝多一塊發布面板
/liff/bus                 家長＝我小孩今天上下車了沒  校方／隨車老師＝這一趟的點名
/liff/class               導師專屬：班級名單 + 每人今天的狀態
/liff（園長）             全園今天的數字 + 需要你處理的 + 各班一覽 + 管理入口
```

**校方那一半在第三、四批才改版**，現在仍指向原本的共用元件（`LeaveView`／
`AttendanceView`／`CommunicationBookView`，與桌面 `/admin/*` 同一份）——
所以 §3b 的功能對等原則沒有被破壞，桌面版一行都沒動。

四種身分各有自己的首頁元件：`ParentHome`（今天的答案）、`TeacherHome`（今天還有幾件事）、
`AdminHome`（全園今天）、`BusHome`（只有一格）。過渡用的 `StaffHome` 已刪除。

### 家長 6 頁的具體決定（第二批）

```text
首頁       封面 → 今天的答案（一張狀態卡）→ 老師今天寫的 → 一顆請假按鈕
           → 娃娃車與公告各一行 → 其餘入口收在最下面
           **本月出席統計搬到 /liff/attendance** —— 那是「回頭看」不是「今天」，
           留在首頁會和答案搶同一個位置
請假       結果在上、表單收進底部面板。家長多數時候是來查「上次那筆准了沒」
聯絡簿     只有一個小孩的家長一進來就是他的聯絡簿（舊版會先要求「選擇學生」，
           清單裡卻只有一個人 —— 等於逼他多按一次確認自己是誰）
出缺勤     這個月三個數字 + 每一天一列
公告       就是一份列表，日期放在標題**上面**（家長先判斷的是「這則是不是新的」）
我的       我是誰 → 哪間園 → 目前身分（只有多重身分的人看得到）→ 顯示設定 → 登出
```

**底部頁籤上的頁面不放返回鍵**（`PageHeader back={false}`）：那些是最上層，退無可退；
放一顆會把人丟去別的地方的箭頭，比沒有箭頭更讓人不安。

**表單一律 `noValidate`，驗證自己來。** 原生 `required` 的泡泡各家瀏覽器長得不一樣、
文案不是我們寫的，而且它擋在 submit 之前 —— 使用者只看到一個灰泡泡，
看不到我們寫在欄位旁邊那句「發生什麼事」。

`AppShell` 已刪除（由 `PersonaShell` 取代）。首頁封面圖疊在頁首上的那段邏輯
一併搬進 `PersonaShell`，並且多一個條件：**只有家長首頁才有封面**
（校方首頁是待辦清單，沒有圖可以疊）。

### 導師 5 頁的具體決定（第三批）

```text
今天       一句話（「今天還有 3 件事」）+ 會變短的待辦磚塊 + 已完成收成一行灰字
點名       打開就是今天這一班 → 進度 + 已存檔 → 一顆「剩下 N 人全部標到校」→ 只處理例外
我的班     /liff/class。名單 + 每人今天的狀態，整列通往那個孩子的聯絡簿
聯絡簿     直欄模式維持不動（已驗收），只換視覺 + 補進度與存檔回饋
請假審核   只剩「等你決定」的申請。**駁回一定要寫理由**
```

**「今天還有幾件事」數的是類別數，不是總筆數。** 老師關心的是「我還要去幾個地方」，
不是「總共還有 37 個小動作」——後者只會讓人先覺得累。三個數字全部由既有查詢
在前端算出來，**沒有新增任何後端端點**：

```text
點名   = 班級名單 − 今天已有出缺勤紀錄的人
聯絡簿 = 班級名單 − 今天已經有內容的紀錄（hasContent）
請假   = 這一班待審清單的長度
```

**班級與日期預設就是對的，所以做小。** 只有一個班就不畫切換；2–3 個班攤開成分段選擇器；
超過 3 個才用底部面板。日期一律收進面板 —— 改日期是例外，不該每天佔一個欄位的位置。

**駁回請假強制寫理由。** 家長收到「已駁回」卻不知道為什麼，只會再打電話問一次老師，
兩邊都沒省到事。核准則不強迫，因為核准本身就是完整的答案。

#### 批次點名（`features/attendance/bulk.ts` + `useBulkMarkAttendance`）

點名的真實流程是「九成的孩子都到了」，所以最有價值的按鈕是「剩下的全部標到校」。
但後端一次只收一個人（`POST /attendance`），25 人的班就是 25 個請求。
直接 `Promise.all` 全丟出去有兩個問題：手機在 LINE 內建瀏覽器上同時開 25 條連線，
後面的會排隊到逾時；而且任何一個失敗都不該讓其他人也沒點到。

作法：`runBatched` 限制同時 4 條、**每一筆各自成敗、中途失敗不中斷其他人**，
全部跑完才失效一次查詢（每成功一筆就 invalidate 會讓整班名單重取 25 次）。
沒成功的筆數會直接寫在畫面上要老師補點，不是沉默吞掉。

> 這是 Phase 9 公告推播那個教訓的同一條規則：**對外部 API 的批次動作，
> 單一失敗絕不可中斷整批。**
>
> 未來若班級規模變大（單班 40 人以上），值得補一個後端批次端點；
> 現在刻意維持純前端，不為了省幾個請求就動後端。

### 園長首頁與全站色彩收斂（第四批之一）

`features/home/AdminHome.tsx`。版面順序刻意是：一句話 → 三個數字 → 需要我處理的
→ 各班今天 → 管理。**管理放最後** —— 園所設定是設好就不太動的東西，
天天擺在最上面只是佔位置。

`features/home/useSchoolToday.ts` 算出全園今天的數字。**沒有新增後端端點**：
後端的出缺勤查詢一次只收一個班，所以對每個班各發一次、在前端加總；
查詢 key 與 `useClassAttendance` 完全一致，所以老師剛點完的資料園長立刻看得到，
不會出現兩邊數字對不上。

> 一間幼兒園通常 3–8 個班，這個數量的並行查詢比為了省幾個請求就動後端划算得多。
> 班級數變多（20 班以上）時值得補 `GET /attendance?date=` 的全校版；
> 那時只要改這個 hook，首頁一行都不用動 —— 這正是把它抽出來的理由。

`features/home/BusHome.tsx`：隨車老師的首頁**只有一格**。他的一天就是
「這條路線今天的上下車」，做完就關掉 App。

#### `Band` 變成薄殼（一改，十五個呼叫端一起生效）

`components/Band` 內部改成 `section + SectionHead`，**分類籤與身分籤直接消失**，
呼叫端一行都不用改。線的粗細（要動手 vs 只是看）是它唯一有效、因此保留下來的東西。

同樣一改全站生效的還有 `ATTENDANCE_STATUS_LABEL` 與 `LEAVE_STATUS_LABEL` 的
`className`：從 Tailwind 預設色（`bg-green-100 text-green-800`）換成狀態色三件組。
全站已無 `text-red-600` / `bg-amber-*` / `bg-green-100` / `bg-orange-*`。

> 這是刻意的順序：**先改「所有頁面共用的那一個地方」，再逐頁重做。**
> 反過來的話，每一頁都要各自處理一次同樣的顏色與斷句。

#### 聯集視圖全部退役（第四批之三、之四）

「一頁同時服務兩種人」的東西已經清乾淨。三個聯集視圖都刪除了：

```text
LeaveView                 → LeaveReview（一份元件兩種範圍：scope='class' | 'school'）
AttendanceView            → TeacherRoster（點名）+ StudentAttendance（單一學生紀錄）
CommunicationBookView     → TeacherBookPanel（整班填寫）+ ParentBook（自己小孩那一本）
BusView（第四批之六）     → ParentBus（我小孩今天上下車了沒）+ BusBoardingPanel（點名）
```

連帶刪除：`TeacherLeaveReviewPanel`、`SchoolLeaveOverviewPanel`、`LeaveForm`、`LeaveList`、
`TeacherRosterPanel`、`AttendanceList`。`StudentBookScreen` 抽成自己的檔案。

**§3b 的功能對等沒有被破壞**：桌面與手機仍是同一份元件，只是那份元件現在依身分渲染。
`/admin/leave`、`/admin/attendance`、`/admin/communication-book` 都跟著換過去。

兩個因此改變的動線，都是刻意的：

```text
校方查「某一個孩子」的出缺勤   → 學生整合視圖 /liff/student/[id]
                                （那一頁本來就把一個孩子的所有東西放在一起）
翻某個孩子過去的聯絡簿         → 班級名單或直欄模式那一列的箭頭
                                → /liff/communication-book/[studentId]
```

**校方仍然可以代家長請假**（`canApplyLeave` 本來就含 TEACHER/ADMIN，家長打電話來請假
是實際會發生的事）：做成 `LeaveReview` 上的次要按鈕，選學生併進同一個面板。
`LeaveRequestSheet` 因此改成收一份 students 清單 —— 只有一位就不畫選擇器，
家長端與校方端共用同一份表單。

**只有 OWNER 身分的園長改不動請假**（docs/05 矩陣審核是 ADMIN/TEACHER）。
舊版照樣畫兩顆按鈕、按下去 403；現在改成一句「這筆由導師或行政人員審核」——
講清楚是誰能處理，比放一顆按了會失敗的按鈕好。

#### 稽核與公告（第四批之五）

`AuditPanel`：查詢條件收進底部面板。進這一頁多數時候是「翻一下最近發生什麼」，
不是來填四個欄位的；條件常駐在最上面等於每次都要先捲過它。
目前套用了什麼條件用一句話寫在標題旁邊，不會因為收起來就不知道自己在看什麼。

`AnnouncementBoard` 取代 `AnnouncementView` + `TeacherAnnouncePanel`：
家長只讀（一份列表），能發公告的人多一顆按鈕，表單在 `AnnounceSheet` 裡。
即使是老師，進這一頁十次有九次是來看有沒有新的 —— 發布是例外。

**`Field` 的 `group` 屬性（寫測試時發現的真 bug）**：`<label>` 會把它的文字指派給
第一個可標記的後代，於是被 `Field` 包住的分段選擇器，第一顆按鈕會被叫成「哪一種假」
而不是「病假」—— 螢幕閱讀器唸出來的東西是錯的。裝一組控制項時要傳 `group`
（改渲染 div），群組自己的名稱由該元件的 `aria-label` 負責。

#### 發送訊息、園所外觀、娃娃車、學生詳細、人員編輯（第四批之六，第四批完結）

剩下的五組行政面板換完。前面幾批的樣板（`StudentsManager` 清單頁、`LeaveReview` 審核頁、
`LeaveRequestSheet` 表單、`AdminHome` 首頁）沒有再長出新的版型 —— 這正是先蓋底層的回報。

```text
發送訊息   頁面主體＝送出紀錄，編輯器收進面板。群發送不出去的不能重來，
           所以回頭查「上次那則送出去了沒、幾個人收到」的次數比新發一則還多。
           **兩段式送出的流程一行沒動**（Human Owner 定案）：第一顆只是準備並攤開則數與
           「不可收回」，第二顆才真的送；任何內容改動都退回第一段。只換視覺。
園所外觀   主體＝一張「家長看到的樣子」預覽（封面＋logo＋園名＋兩個色點），
           三個入口各自把編輯器收進面板。面板自己存得起來 —— 改完還要關掉面板
           再找一顆按鈕，中間那一步就是「我到底存了沒」的來源。
娃娃車     點名的互動一行沒動（Human Owner 已驗收「一手扶車一手點」），
           補上進度條與已存檔：車上訊號不穩時，看不到回饋的人就會再點一次。
           設定頁改清單頁；路線名稱與發車時間從「失焦就存」改成面板裡按儲存。
學生詳細   最上面那塊是「這是誰的頁面」（不算一段，沒有標題也沒有線），
           翻閱的段落細線、唯一改得動東西的娃娃車粗線。
人員編輯   見下面「破壞性動作一律進面板」。
```

**LINE 圖文選單補上手機版（修掉一個 §3b 的破口）。** `RichMenuSection` 原本只掛在
桌面版 `/admin/appearance`，理由是「需要大畫面反覆比對」——但那不在 §3b 的明文例外裡，
而且停課、颱風這種最需要臨時改選單的時刻，園長往往不在電腦前。改版後它收在
`AppearanceEditor` 的面板中，兩個外框一起拿到，桌面頁反而少一個 import。
它的主要按鈕跟著狀態換：**還沒存就是「儲存設計」，存好了才變「套用到 LINE」**
——同時放三顆按鈕會讓人不知道現在該按哪一顆（儲存與套用分開的理由不變：
LINE 的建立選單每小時只有 100 次）。

#### 破壞性動作一律進面板（第四批之六真正修掉的東西）

人員編輯那三個檔案要改的其實不是版面，是**誤按**。原本有四處「就地把按鈕展開成兩顆」：

```text
移除身分      RolesSection      連帶取消他帶的班 / 解除他綁的小孩
解除小孩綁定  PersonEditor      他立刻看不到那個孩子的出缺勤、聯絡簿與請假
解除 LINE 綁定 BindingSection   本人當場登不進來
停用帳號      PersonEditor      登不進來，而且不能再被指派身分
```

就地展開的問題是：**「確定移除」正好長在手指剛按過「移除」的位置上**，連按兩下就沒了。
四處全部改成底部面板問一次，而且每一句都寫出他會失去什麼。
娃娃車的刪除路線／刪除接送點同理（並且講明「這條路線上的 N 個接送點會一起消失」）。
`PersonEditor.spec` 把這條性質釘住：按了不會直接送出、確認鈕才送、警語一定要出現。

> 面板不互相疊：刪除的確認是**關掉編輯面板、再開確認面板**（`RouteEditor`、`PersonEditor`
> 都是這樣），不是把 `<dialog>` 疊在 `<dialog>` 上。因此像 `PersonEditor` 這種
> 留在頁面上而不收進面板的區塊，它底下的確認面板才永遠只有一層。

### 切換身分的十個坑（Human Owner 2026-08-20 實機回報後修正）

改成「一次只用一種身分」之後踩到的十件事，每一件都不是版面問題：

**① 出口只有一半。** 切換鈕原本只畫在校方那一側，於是切到家長之後就找不到路回去
—— 等於把人關在家長身分裡出不來。現在頁首的形狀對每一種身分都一樣：
**左邊園所識別、右邊身分鈕 + 通知鈴**，位置固定不變。切換是雙向的。

**② 資料範圍沒有跟著身分切（踩了兩次）。** `GET /me/students` 與 `GET /classes`
回的都是**角色聯集**（老師自班 ∪ 園長全校 ∪ 家長自己小孩）：

```text
第一次  園長兼家長切到家長身分  → 「選擇孩子」列出全校 125 位，
                                 首頁把排序第一個陌生小孩當成他的孩子
第二次  只帶一班的導師（兼園長）→ 點名頁與聯絡簿頁看得到別班的班級與孩子
```

修法在**後端**加縮小範圍的參數（只在前端過濾等於整份名單仍然送到了瀏覽器）：

```text
GET /me/students?relation=GUARDIAN   只回我監護的小孩（家長身分）
GET /me/students?relation=TEACHING   只回我實際帶的班上的孩子（導師身分）
GET /classes?scope=TEACHING          只回我實際帶的班（導師身分）
```

前端**只有兩個地方**決定資料範圍，新頁面一律用它們，不要直接呼叫 `useMyStudents()`
或 `useMyClasses()`：

```text
features/students/useSelectedStudent.ts  useVisibleStudents()
features/classes/hooks.ts                useVisibleClasses()（useSelectedClass 也走它）
```

兩者都用 `enabled` 把不該用的那幾支查詢整個關掉，不讓它們在背景抓。

> **這幾條路只縮小、永遠不放大**：沒有那層關係就回空陣列，就算他是園長。
> 端點與服務層都有測試釘住。
>
> **通則**：改成「一次只用一種身分」之後，**每一支拿資料的查詢、每一個依角色決定畫不畫的
> 入口，都要問一次「這個是不是該跟著身分切」**。UI 切開了但資料或入口沒切開，比不切更危險
> —— 使用者以為自己在一個受限的世界裡。見下面第 ⑦ 條。

**③ 換身分後舊的選擇沒有失效。** 名單整個換掉之後，`studentId` 還停在
剛剛以老師身分選的那個學生。`useSelectedStudent` 現在會檢查「目前選的還在不在新名單裡」，
不在就重選第一個。

**④ 停用的帳號仍可被指派身分與關聯。** 後端 `grantRole` / `addGuardianship` /
`addTeacherAssignment` 都沒有檢查帳號狀態，於是班級名單上會掛著一個登不進來的老師，
而帳號一旦重新啟用又默默帶著權限回來 —— **幽靈權限比沒有權限更危險**。
現在三處都擋（409 `user_disabled`），**移除不受此限**（那正是清理停用帳號要做的事）；
編輯面板也先講清楚，不讓人填完按下去才發現。

**⑤ 園長身分找不到聯絡簿。** 底部只有四格（總覽／名單／訊息／我的），放不下。
入口改放在 `AdminHome` 的「每天的事」一段 —— 園長代課或老師請假時確實會用到。

**⑥ hero 只寫自己的名字。** 園長切到家長身分後，封面圖上仍是「早安，○○○」，
讀起來像還在跟園長打招呼。`HomeHero` 加了 `context`，家長身分傳
「王小明 的家長」——寫出是「誰的家長」才看得出自己站在哪一邊。

**⑦ 入口沒有跟著身分切（同一個坑第四次）。** ②③ 都是**資料範圍**；這一次是**介面入口**：
老師兼家長切到家長身分之後，`/liff/announcement` 上仍然有一顆「發一則公告」
（Human Owner 2026-08-20 回報）。同一個形狀還有：聯絡簿的編輯權（`canMarkAttendance`）、
學生頁的娃娃車設定（`canManageSchool`）、家長首頁的稽核卡。

根因與前幾次一樣：`roleFlags(user.roles)` 取的是**角色聯集**，而畫面已經切成一次一種身分。
他確實是老師、後端也會放行 —— 但**入口出現在家長的世界裡，這個殼就白切了**。
修法同樣是收斂成一個地方：

```text
資料範圍   useVisibleStudents() / useVisibleClasses()     這個身分看得到哪些資料
介面入口   useCapabilities()（lib/useCapabilities.ts）    這個身分看得到哪些入口
```

`useCapabilities` ＝ `personaFlags(roleFlags(roles), persona)`，**只在家長身分收斂校方那一半**。
校方三種身分（staff / teacher / bus）維持角色聯集，因為硬切會出事：同時是導師與隨車老師的人，
`availablePersonas` 只會給他 `teacher`（bus 身分要「沒有其他校方身分」才成立），
在 teacher 身分下拿掉 `canMarkBusRide`，他就再也點不到娃娃車點名了。

**桌面後台（`/admin/*`）不受身分影響，一律用角色。** 身分是手機殼的概念，桌面版沒有那層外框；
而且身分記在 localStorage 是跨外框共用的 —— 園長昨天在手機上切到家長身分，
今天打開電腦後台就會整片空白。判斷用 `surfaceOf(pathname)`，不由呼叫端傳 prop
（與 `SplitColumns` 同一條理由：兩個十行的 page.tsx 各要記得傳一次，遲早漏一個）。

> **兩件事要分清楚**：`roleFlags` ＝**有沒有權限**（對應後端 Guard，用在「進不進得來這一頁」）；
> `useCapabilities` ＝**這個身分現在要不要看到**（用在共用元件裡「畫不畫這一塊」）。
> 真正的授權永遠在後端。
>
> 新頁面一律用 `useVisibleStudents()` / `useVisibleClasses()` / `useCapabilities()` 這三個，
> 不要直接呼叫 `useMyStudents()` / `useMyClasses()` / `roleFlags()`。

**⑧ 切換身分之後還站在原來那一頁。** 園長在人員管理頁上切成家長身分，那一頁還留在畫面上
（Human Owner 2026-08-20 回報）。殼切了但位置沒切 ——「一次只用一種身分」的意思是
切下去整個世界都要換掉，包括你現在站的位置。

`lib/personaRoutes.ts` 列的是**例外**（只屬於某一種身分的那幾條），不是白名單：
大部分頁面兩種身分都成立、只是內容不同（`/liff/leave` 家長是申請、校方是審核），
**那些切過去要留在原地** —— 那正是「同一個網址，依身分渲染不同的頁」的設計。

```text
/liff/admin/*、/liff/audit   只有 staff 站得住
/liff/class                  只有 teacher
/liff/student/*              staff 或 teacher（家長看自己小孩走聯絡簿那條路）
其餘                          每一種身分都站得住
```

站不住就 `router.replace('/liff')`——每一種身分的首頁都是同一個網址，內容才依身分不同。

**⑨ 訊息中心與網址帶著的 studentId。** 家長身分的訊息中心看得到其他小朋友的聯絡簿
（Human Owner 2026-08-20 回報）。兩層各修一次：

```text
收件匣本身   GET /notifications?relation=GUARDIAN（後端過濾，見 docs/07 §4j）
那一扇門     StudentBookScreen 檢查 studentId 在不在 useVisibleStudents() 裡
```

**入口擋住不等於門擋住**：網址是可以被貼、被記住、被舊通知帶進來的。
兩層都要，而且最後一道永遠在後端。

**⑩ 同一個人的兩種身分在對話裡分不出來。** 班導兼某位學生的家長，在那個孩子的聯絡簿裡
兩種身分講的話長得一模一樣（Human Owner 2026-08-20 回報）。

前九個坑都是「該藏的沒藏」，這一個相反：**該講的沒講**。而且它不是前端算得出來的 ——
系統原本根本沒有記下「發話當下戴的是哪頂帽子」（身分是讀取時推導的，規則寫死成
「是這個孩子的家長就顯示家長」）。所以修在資料層：`Message.senderAs`（見 docs/07 §4k）。

畫面上的決定（Human Owner 選 A 案）：

```text
位置不動   自己的訊息永遠靠右。「右邊＝我寫的」是聊天介面最基本的約定，
           把自己剛打的字丟到左邊，看起來像有人冒用你的名字。
換的是標籤 自己的泡泡上多一行「我 · 導師」／「我 · 母親」。
只在需要時 **只有「這一串裡我用過兩種身分」時才標** —— 一般家長每一句都掛「· 母親」
           是廢話，他本來就知道那是自己講的。連著同一種身分講好幾句只標第一句。
```

**三個 hook 的分工到這裡定型**：

```text
useVisibleStudents() / useVisibleClasses()   這個身分看得到哪些資料
useCapabilities()                            這個身分看得到哪些入口
isRouteForPersona()                          這個身分站不站得住這一頁
```

三個都問同一個 `useScopedPersona()`：**桌面後台 `/admin/*` 一律回 null（不套身分）**。
身分是手機殼的概念，桌面版沒有那層外框；而身分記在 localStorage 是跨外框共用的
—— 園長昨天在手機上切到家長身分，今天打開電腦後台，點名頁只會列出他自己的小孩、
人員管理整片空白。那不是「切身分」，那是壞掉。

### 手感規範（每一頁交付前都要對一次）

```text
換頁      殼不動只換內容，交叉淡入，不准閃白
按壓      手指按下當下就縮到 0.97，不等網路
送出      樂觀更新 —— 畫面先變，失敗才退回並說原因
載入      骨架屏形狀和真內容一樣，載入完不位移
短任務    底部面板，不跳頁
觸控      至少 44 × 44px，相鄰兩顆間距至少 8px
預載      底部頁籤那幾頁閒置時先抓好資料
冷啟動    LIFF SDK 初始化那 0.5–1 秒放園所 logo 的開場畫面，不准白屏
震動      Android 上點名成功震 10ms。iOS 不支援，不做替代品
減少動態  prefers-reduced-motion 一律尊重，動畫全關但功能不變
```

**做不到的先講清楚**：iOS 沒有震動回饋、沒有系統級側滑返回、LINE 頂欄佔一條。
這些是平台限制，不是技術選擇的問題。

#### 這十條的實作狀態（2026-08-20）

```text
按壓 / 樂觀更新 / 骨架屏 / 觸控 44px / 短任務用面板 / 減少動態   ✅ 隨各批一起做完
冷啟動開場畫面   ✅ components/SplashScreen。三段等待各自一句話，底色用品牌色所以不閃白。
                    進度條刻意來回跑不讀百分比 —— 我們真的不知道 LIFF SDK 還要多久。
震動             ✅ lib/haptics。只有一種：成功了震 10ms（「碰一下」不是通知）。
                    點名成功、上下車成功才震；「今日未搭」「取消」不震（那是修正不是完成），
                    批次點名要**整批都成功**才震（有人沒點到卻給成功的手感是在說謊）。
                    iOS 沒有 Vibration API，**刻意不做替代品** —— 唯一的路是拿隱藏元件
                    去騙 Taptic Engine，會隨系統版本壞掉而且壞了沒人發現。
預先載入         ✅ lib/useIdlePrefetch。閒下來預載底部四格的**路由**。
                    **刻意不預載資料**：資料的查詢參數跟身分綁在一起（哪一班、哪個孩子），
                    猜錯就是替使用者發一支沒有權限的請求，在後端留一筆 403 的稽核紀錄。
                    資料本身有 30 秒 staleTime，真正重複去的頁面本來就不會每次重抓。
換頁交叉淡入     ❌ 還沒做。現在是 components/PageTransition 的自製位移動畫。
```

**為什麼換頁交叉淡入還沒做（不是忘記，是評估後緩下來）**：真正的交叉淡入要
`document.startViewTransition` 在**舊畫面還在 DOM 上的時候**呼叫，而 App Router 是先 commit
新的樹再跑 effect —— 等我們拿到 pathname 變化時，舊畫面早就不見了，沒有東西可以淡出。
所以只能包住「導覽」本身（攔截連結點擊或包 `router.push`），而那條路一旦寫錯，
**壞掉的是全站每一個連結**。Next 14 沒有內建（`experimental.viewTransition` 是 15.2 之後），
可靠的作法是引入 `next-view-transitions` —— 那是一個要 Human Owner 決定的相依套件。
在沒有真機、沒有 LINE 內建瀏覽器可以驗的情況下，不該把導覽押上去。

### 深色模式（2026-08-20）

**跟隨系統設定（`prefers-color-scheme`），不做 App 內的開關。** LINE 的深色模式本來就跟著系統，
App 內再給一顆獨立開關，只會做出「LINE 是深的、裡面那頁是淺的」這種對不起來的狀態。

只重新定義 token，元件一行都沒改 —— 這正是先蓋底層的回報。三個刻意的決定：

```text
不是把淺色反轉    反轉會讓森綠變螢光綠、米白變純黑，兩個都不是清葉。
                  底色是「森林夜色」（帶綠的深灰），不是純黑。
狀態色整組重配    淺色那組是「淡底 + 深字」，深色必須是「深底 + 淡字」；
                  直接調暗會變成深底配深字。
品牌色要調亮      園所選的主色多半偏深（那是給白紙用的），放在深底上會糊掉。
                  所以 runtime 只寫 --brand-base（原色），--brand-primary 由 CSS
                  依明暗推導；實心品牌底上的字改用 --brand-contrast（淺色白 / 深色深）。
```

`color-scheme: light dark` 一定要宣告：原生控制項（date / time / select / color）才會跟著換，
而且 Android 的「強制深色」不會再自己去反轉一整頁 —— 它反轉出來的顏色沒有人設計過。

新增的中性 token：`--overlay`（疊在任何底色上的極淡層，取代 `bg-black/[0.03]` ——
黑色疊在深底上等於什麼都沒發生）、`--hairline`、`--scrim`（底部面板背後那層）。

> **`lib/theme.ts` 同時修掉一個一直在生效的 bug。** 它原本讓每套主題各帶一份中性色的副本，
> 由 `BrandingProvider` 在 runtime 用 inline style 寫到 `<html>`。inline style 贏過 `:root`，
> 於是**那份副本才是真正生效的值** —— 而它停在「清葉加厚」之前：`--ink-soft` 還是 `#8a9188`
> （加厚時已加深成 `#6e7770`，理由正是「長輩在戶外看得見才算數」）、`--radius-card` 還是 18px。
> globals.css 改了半天，跑起來的其實是舊的。同一個機制也會讓深色模式整組被靜靜蓋掉。
> 現在主題只給一個名字（`<html data-theme>`），**顏色一律由 CSS 決定**。

hero 的品牌色退路（沒有封面圖時）刻意仍用 `--brand-base`：那一塊上面壓的是白字，
底色一調亮白字就沒了。hero 是一張「照片」，不跟著頁面換明暗。

`app/global-error.tsx` 維持寫死的淺色 —— 那一頁在 CSS 都可能沒載到的情況下要能顯示，
不能依賴任何 token。

### 設計系統的守門（`eslint.config.mjs` 的 `design-system/no-retired-styles`）

規則寫在文件裡不會自己執行。下一個人（或下一個視窗的我）加新頁面時，
最省事的作法永遠是複製一段舊的 class。這條規則擋三件事：

```text
已退役的全域 class   card / btn-primary / btn-secondary / field-label
                     / section-title / eyebrow / chip
                     → globals.css 的 @layer components 現在只剩 .field 與 .tappable
Tailwind 預設色      bg-red-100 那一類。狀態走 good/wait/note/stop、品牌走 brand-*、
                     中性走 ink/line/surface
已移除的字級         text-3xs / text-4xs（最小停在 11px）
```

**寫成 plugin 而不是 `no-restricted-syntax` 的選擇器**：選擇器字串裡的 `\s`
會先被 JS 字串跳脫吃掉一層變成 `s`，規則看起來設好了、實際上從來沒擋住任何東西。
第一版就是這樣寫的；換成 plugin 之後立刻抓到 5 處人工 grep 漏掉的
（其中一處是 `features/audit/labels.ts` 裡三組 Tailwind 預設色，而本文件當時宣稱「全站已無」）。
**一個永遠不會亮的守門比沒有守門更危險。**

#### 色彩對比（`lib/contrast.spec.ts`，2026-08-20）

守門的第二道。第一道（eslint）擋的是「用錯顏色」，這一道擋的是「顏色本身就看不見」。
測試直接讀 `globals.css`，把 `var()` 與 `color-mix()` 展開成實際色碼再算 WCAG 對比值 ——
所以調色盤一退步就會亮，不必靠人記得去量。

門檻依 WCAG 2.1 AA：一般文字 4.5:1、介面元件與狀態的邊界 3:1（1.4.11）。
純裝飾（`--line` 這種只是分隔的細線、狀態塊裡的 `edge`）不在規範內，也就不量。

**第一次跑起來就抓到四個不合格的值，全部是既有的、不是深色模式帶來的：**

```text
--ink-soft     4.43   差一點就是不合格，而它承擔全站的次要字（多半 11–14px）
--ink-mute     2.51   用在 11px 的時間戳與提示 —— 等於看不見
--line-strong  1.57   設計系統說它的意思是「這一塊可以點」，那就是介面元件的邊界；
                      輸入框的邊界在強光下根本分不出來
深色 --ink-mute 4.15
```

這正是 Human Owner 一開始說的「長輩在戶外看不見」—— 只是先前沒有人把它量出來。
加厚時 `--ink-soft` 已經從 `#8a9188` 加深過一次，仍然差 0.07。

修正後：`--ink-soft #59605b`（≥5.5）、`--ink-mute #6b7069`（≥4.5）、
`--line-strong #8d8c7f`（≥3.0），深色三個同步調整。

> **代價要講清楚**：三層字色全部拉到 4.5 之後，它們之間的階差被壓縮得很小
> —— 在接近白的底上要同時滿足 4.5，本來就沒有多少空間可以「淡」。
> 測試因此另外釘住「深淺順序不能反過來」：反過來的話，淡掉的東西會比正文還搶眼。
>
> `--line-strong` 變深是**看得出來的視覺改變**（每一張卡片、每一個輸入框的邊）。
> 方向上與「加厚：細線改實線」一致，但這一項值得在真機上確認一次。

`--brand-contrast` 對 `--brand-primary` 只保證預設的森綠：品牌色是 per-school 的，
園所挑一個很淺的主色時白字一樣會不見 —— 那要在「園所外觀」擋，不是在這裡。

### 尚未決定

完整的鍵盤導覽測試與 Lighthouse 尚未接進 CI。
換頁的交叉淡入見上面「手感規範」那一節（評估後緩下來，不是忘記）。

## 4. Card-based Dashboard (§25，config-driven)

**不寫死任何角色首頁**。每張 Card 宣告顯示條件，**後端** `GET /me/dashboard` 回傳已過濾的 `cards[]`，前端只 render（Rule 5/6）：

```ts
interface CardDescriptor {
  id: string;
  requiredRoles: Role[];
  requiredFeature?: string;   // 對應 SchoolConfig.featureFlags
  requiredPlan?: string;      // 未來 subscription plan
  order: number;              // 可被 SchoolConfig.cardOrder 覆蓋
}
```

## 5. 共用型別 (packages/shared)

Event 型別、API DTO / Zod contract、Role/Enum → 前後端一致，編譯期強制「Backend 定義、Frontend 消費」。
