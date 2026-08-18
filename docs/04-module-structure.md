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
