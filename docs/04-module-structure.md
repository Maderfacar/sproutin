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
       --ink-soft      比舊版深一階（#6e7770）；真正可以淡掉的改用 --ink-mute
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

> Band 目前仍在舊頁面上運作，隨第二～四批逐頁替換完後刪除。

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

#### 第四批還沒做完的（下一個視窗）

```text
學生 / 班級 / 人員與綁定 / 權限     StudentsManager、ClassesManager、
                                    PeopleManager+PersonEditor+BindingSection+RolesSection、
                                    RolesOverview
發送訊息                            MessageComposer、PushCampaignPanel、CardPreview、CampaignHistory
園所外觀                            AppearanceEditor、BrandSection、CardsSection、RichMenuSection
娃娃車設定                          BusSettingsPanel、RouteEditor、StudentBusSection
稽核 / 全校請假 / 公告發布 / 學生詳細  AuditPanel、SchoolLeaveOverviewPanel、
                                    TeacherAnnouncePanel、StudentDetail
```

這些頁面的**功能對等已經完成**（§3b），色彩與斷句也已隨上面兩個共用點一起換掉；
還沒做的是版面本身：原生 `<select>`、空狀態文案、觸控目標、
以及把 `btn-primary` / `.card` 換成 `components/ui` 的元件。

### 切換身分的三個坑（Human Owner 2026-08-20 實機回報後修正）

改成「一次只用一種身分」之後踩到的三件事，每一件都不是版面問題：

**① 出口只有一半。** 切換鈕原本只畫在校方那一側，於是切到家長之後就找不到路回去
—— 等於把人關在家長身分裡出不來。現在頁首的形狀對每一種身分都一樣：
**左邊園所識別、右邊身分鈕 + 通知鈴**，位置固定不變。切換是雙向的。

**② 資料範圍沒有跟著身分切。** `GET /me/students` 回的是**角色聯集**
（老師自班 ∪ 園長全校 ∪ 家長自己小孩）。園長兼家長的人切到家長身分後，
「選擇孩子」列出全校 125 位，首頁還把排序第一個陌生小孩當成他的孩子。

修法是在**後端**加 `?relation=GUARDIAN`（只回監護關係，不取聯集）——
只在前端過濾等於整份名單仍然送到了瀏覽器。前端由
`features/students/useSelectedStudent` 的 `useVisibleStudents()` 依身分決定用哪一支，
並且用 `enabled` 把另一支整個關掉，不讓它在背景抓。

> **這條路只縮小、永遠不放大**：沒有監護關係就回空陣列，就算他是園長。
> 端點與服務層都有測試釘住這件事。

**③ 換身分後舊的選擇沒有失效。** 名單整個換掉之後，`studentId` 還停在
剛剛以老師身分選的那個學生。`useSelectedStudent` 現在會檢查「目前選的還在不在新名單裡」，
不在就重選第一個。

**④ hero 只寫自己的名字。** 園長切到家長身分後，封面圖上仍是「早安，○○○」，
讀起來像還在跟園長打招呼。`HomeHero` 加了 `context`，家長身分傳
「王小明 的家長」——寫出是「誰的家長」才看得出自己站在哪一邊。

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

### 尚未決定

深色模式。目前全站只有淺色。token 層已經備好（要加只需在 `globals.css` 重新定義變數，
元件一行都不用改），但那是另一批的工作量，等頁面重做完再談。

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
