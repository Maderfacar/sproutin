# @sproutin/api — NestJS Modular Monolith

見 [docs/04-module-structure.md](../../docs/04-module-structure.md)。

## 目標模組結構（實作階段建立）

```text
src/
├── main.ts
├── app.module.ts
├── core/         config · event-bus · outbox · prisma · redis
├── auth/         LINE Login → JWT · rbac (RolesGuard, ScopeGuard)
├── school/ class/ user/ student/ parent/ teacher/
├── attendance/ leave/ message/ announcement/ notification/
└── _reserved/    health/ bus/ report/ ai/ subscription/ payment/
```

## 鐵則

- 跨模組不直接 import 對方 service → 走事件或 public interface (Rule 8)
- Business logic 不在 UI，所有授權在後端 (Rule 4/5/6)
- 每個 domain module：controller / service / repository / events / dto

## 下一步（實作 Phase 1）

1. `core/prisma` PrismaService（注入 `DATABASE_URL`）
2. `core/outbox` + BullMQ dispatcher
3. `auth` LINE Login 驗證 + JWT + RolesGuard/ScopeGuard
4. `leave` 模組（含 `LeaveApproved` outbox 事件）作為第一條 vertical slice
5. `attendance` 訂閱 `LeaveApproved` → 自動 upsert
