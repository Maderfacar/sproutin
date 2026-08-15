import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { AuditEntry } from './audit.service';

// out-of-band 稽核佇列名稱（Worker consumer 對應同名佇列，見 worker.ts）。
export const AUDIT_QUEUE = 'audit';

const ENQUEUE_ATTEMPTS = 5;
const BACKOFF_DELAY_MS = 2_000;

// Out-of-band audit producer（ADR-005 類別二）。API 端把 DENIED / FAILURE / 敏感 READ
// enqueue 進 durable BullMQ 佇列 `audit`（Redis 持久化 + retry/backoff + DLQ）;Worker consumer 寫入 AuditLog。
//
// 設計要點（ADR-005 / docs/06 §5）：
//   - **永不阻塞**使用者請求、**永不丟出**：enqueue 失敗只降級記 log，呼叫端一律 fire-and-forget。
//   - **REDIS_URL 未設定**（dev / CI / DI smoke test）→ 直接走降級路徑（不連線、不建佇列）。
//   - Redis 連線 **lazy**：第一次真正 enqueue 才建立，讓無 Redis 環境於啟動時不連線。
//   - 降級（last-resort）：輸出含完整 payload 的 structured ERROR log，供 log pipeline 回收 + ops 告警。
@Injectable()
export class AuditEnqueuer implements OnModuleDestroy {
  private readonly logger = new Logger('AuditEnqueuer');
  private readonly redisUrl = process.env.REDIS_URL;
  private connection?: IORedis;
  private queue?: Queue<AuditEntry>;

  get enabled(): boolean {
    return Boolean(this.redisUrl);
  }

  // lazy 建立佇列;無 REDIS_URL 回 undefined（呼叫端走降級）。
  private getQueue(): Queue<AuditEntry> | undefined {
    if (!this.redisUrl) {
      return undefined;
    }
    if (!this.queue) {
      // BullMQ 要求 maxRetriesPerRequest = null。
      this.connection = new IORedis(this.redisUrl, { maxRetriesPerRequest: null });
      this.queue = new Queue<AuditEntry>(AUDIT_QUEUE, { connection: this.connection });
    }
    return this.queue;
  }

  // 送出一筆 out-of-band 稽核。永不丟出、永不阻塞。
  async enqueue(entry: AuditEntry): Promise<void> {
    const queue = this.getQueue();
    if (!queue) {
      this.fallback(entry, 'REDIS_URL 未設定');
      return;
    }
    try {
      await queue.add(entry.action, entry, {
        attempts: ENQUEUE_ATTEMPTS,
        backoff: { type: 'exponential', delay: BACKOFF_DELAY_MS },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } catch (err) {
      // enqueue 失敗（Redis 不可用）→ 降級 structured log;不丟出、不阻塞請求。
      this.fallback(entry, (err as Error).message);
    }
  }

  // 降級路徑（ADR-005 last-resort）：完整 payload 進 ERROR log 供回收。
  private fallback(entry: AuditEntry, reason: string): void {
    this.logger.error(`[audit-fallback] (${reason}) ${JSON.stringify(entry)}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
    await this.connection?.quit();
  }
}
