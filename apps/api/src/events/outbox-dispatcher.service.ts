import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';

// OutboxEvent.status 生命週期（欄位為自由 String，零 migration）：
//   PENDING → PROCESSING（claim，避免重複派發）→ DISPATCHED（handler 成功）
//   handler 重試耗盡 → FAILED（保留供人工/DLQ 檢視）
export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'DISPATCHED' | 'FAILED';

export interface ClaimedEvent {
  id: string;
  eventType: string;
  payload: unknown;
}

const CLAIM_BATCH_SIZE = 20;

// Transactional Outbox dispatcher（Worker 端，docs/06 §1/§3）。
//   - claimBatch：撈 PENDING → 以 status guard 樂觀鎖翻 PROCESSING（單 worker 恆成功;
//     多 worker 時只有翻成功者擁有該列，等效 SKIP LOCKED，不重複派發）。
//   - markDispatched / markFailed：handler 成功 / 重試耗盡後回寫狀態。
//   - resetStaleProcessing：啟動時把上次崩潰遺留的 PROCESSING 退回 PENDING（handler idempotent，重放安全）。
// BullMQ 佇列接線（retry/backoff/DLQ）於 worker.ts;本服務只負責 DB claim/mark（可純單元測試）。
@Injectable()
export class OutboxDispatcherService {
  constructor(private readonly prisma: PrismaService) {}

  // 撈並認領一批待派發事件。回傳實際認領到（PENDING→PROCESSING 成功）的事件。
  async claimBatch(limit: number = CLAIM_BATCH_SIZE): Promise<ClaimedEvent[]> {
    const pending = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true, eventType: true, payload: true },
    });

    const claimed: ClaimedEvent[] = [];
    for (const ev of pending) {
      const res = await this.prisma.outboxEvent.updateMany({
        where: { id: ev.id, status: 'PENDING' },
        data: { status: 'PROCESSING' },
      });
      if (res.count === 1) {
        claimed.push({ id: ev.id, eventType: ev.eventType, payload: ev.payload });
      }
    }
    return claimed;
  }

  async markDispatched(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'DISPATCHED', dispatchedAt: new Date() },
    });
  }

  async markFailed(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'FAILED' },
    });
  }

  // 啟動時退回遺留的 PROCESSING（上次進程在 claim 與完成之間崩潰）。回傳退回筆數。
  async resetStaleProcessing(): Promise<number> {
    const res = await this.prisma.outboxEvent.updateMany({
      where: { status: 'PROCESSING' },
      data: { status: 'PENDING' },
    });
    return res.count;
  }
}
