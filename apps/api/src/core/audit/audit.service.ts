import { Injectable } from '@nestjs/common';
import type { Prisma } from '@sproutin/db';
import { PrismaService } from '../prisma/prisma.service';

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

// 稽核寫入（ADR-005）。兩條路徑共用同一組欄位映射（toData）：
//   - record(tx, entry)：**Transactional Audit（類別一）**——狀態變更操作的 AuditLog 與業務變更
//     寫在同一 DB transaction，原子。因 AuditLog 與業務同在該校 DB，不新增可用性依賴。
//   - recordStandalone(entry)：**Out-of-band Audit（類別二）**——DENIED / FAILURE / 敏感 READ
//     沒有可搭載的業務交易;由 Worker 的 `audit` 佇列 consumer 呼叫，自身隱式交易 INSERT（append-only）。
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // 必須傳入 transaction client（tx），確保與業務變更同一交易。
  async record(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    await tx.auditLog.create({ data: this.toData(entry) });
  }

  // out-of-band 單筆寫入（Worker consumer 用）;無業務交易可搭載，直接以 PrismaService 建立。
  async recordStandalone(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({ data: this.toData(entry) });
  }

  // 統一欄位映射;選填欄位缺省傳 undefined（不寫入 null）。
  private toData(entry: AuditEntry): Prisma.AuditLogCreateInput {
    return {
      actorUserId: entry.actorUserId ?? undefined,
      actorRole: entry.actorRole ?? undefined,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? undefined,
      result: entry.result,
      scopeType: entry.scopeType ?? undefined,
      scopeId: entry.scopeId ?? undefined,
      metadata: entry.metadata as Prisma.InputJsonValue | undefined,
    };
  }
}
