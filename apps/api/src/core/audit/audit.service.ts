import { Injectable } from '@nestjs/common';
import type { Prisma } from '@sproutin/db';

// 稽核結果（對齊 Prisma enum AuditResult）。
export type AuditResultValue = 'SUCCESS' | 'FAILURE' | 'DENIED';

export interface AuditEntry {
  actorUserId: string | null; // 誰（system 操作為 null）
  actorRole?: string | null; // 當下角色
  action: string; // 什麼 Action，如 "leave.approve"
  resourceType: string; // 對哪個資源，如 "Leave"
  resourceId?: string | null;
  result: AuditResultValue; // 結果
  scopeType?: string | null;
  scopeId?: string | null;
  metadata?: Record<string, unknown>; // 變更摘要;不得存敏感明文（健康、訊息內容）
}

// Transactional Audit（ADR-005 類別一）：狀態變更操作的 AuditLog 與業務變更
// 寫在**同一 DB transaction**，原子 —— 一起 commit 或一起 rollback，永不出現「有業務、無 audit」。
// 因 AuditLog 與業務同在該校 DB，不新增可用性依賴（ADR-005 前提）。
//
// out-of-band 路徑（DENIED / FAILURE / 敏感 READ → durable BullMQ 佇列 `audit` + DLQ）
// 於 Phase 7 Step 6 建立;本服務只負責交易內同步寫入。
@Injectable()
export class AuditService {
  // 必須傳入 transaction client（tx），確保與業務變更同一交易。
  async record(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? undefined,
        actorRole: entry.actorRole ?? undefined,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? undefined,
        result: entry.result,
        scopeType: entry.scopeType ?? undefined,
        scopeId: entry.scopeId ?? undefined,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
