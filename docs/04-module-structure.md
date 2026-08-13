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
