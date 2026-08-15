/* eslint-disable no-console */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { WorkerModule } from './events/worker.module';
import { OutboxDispatcherService, type ClaimedEvent } from './events/outbox-dispatcher.service';
import { EventHandlersService } from './events/event-handlers.service';
import { PushNotificationService } from './events/push-notification.service';
import { AuditService, type AuditEntry } from './core/audit/audit.service';

// Sproutin Worker entrypoint（同一 image、不同 CMD，§20 / docs/04）。
// Phase 7 Step 3：消費 Transactional Outbox → 派發領域事件到 handler（投影/回滾/通知）。
//   1) Nest standalone context（WorkerModule）取得 dispatcher + handler（重用業務碼，決策 2）。
//   2) Outbox poller：claim PENDING → enqueue BullMQ `events`（jobId=outbox.id 去重，決策 1）。
//   3) BullMQ consumer：跑 handler → 成功標 DISPATCHED;retry/backoff/DLQ 由 BullMQ 提供。
// Step 5：line-push 佇列/consumer（best-effort 推播）。
// Step 6：audit 佇列 consumer（out-of-band 稽核落地，ADR-005 類別二）——
//   API 端 DENIED/FAILURE/敏感 READ enqueue 到 `audit` 佇列，這裡 INSERT 進 AuditLog（append-only）。

const EVENTS_QUEUE = 'events';
const LINE_PUSH_QUEUE = 'line-push';
const AUDIT_QUEUE = 'audit';
const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS = 5;
const PUSH_ATTEMPTS = 3;

// line-push job 承載：站內通知 commit 後，據事件型別推播（PushNotificationService 只推重點事件）。
interface PushJob {
  eventType: string;
  payload: unknown;
}

async function bootstrap(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('[worker] REDIS_URL 未設定，無法連線 Redis');
    process.exit(1);
  }

  // Nest standalone context（無 HTTP 層）：連 DB、解析 WorkerModule DI 圖。
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  const dispatcher = app.get(OutboxDispatcherService);
  const handlers = app.get(EventHandlersService);
  const pushService = app.get(PushNotificationService);
  const auditService = app.get(AuditService);

  // BullMQ 要求 maxRetriesPerRequest = null。
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue<ClaimedEvent>(EVENTS_QUEUE, { connection });
  const pushQueue = new Queue<PushJob>(LINE_PUSH_QUEUE, { connection });

  // Consumer：跑 handler（站內通知）→ 成功標 DISPATCHED → enqueue LINE 推播（Step 5）。
  // 丟出 → BullMQ 依 attempts/backoff 重試。
  const worker = new Worker<ClaimedEvent>(
    EVENTS_QUEUE,
    async (job: Job<ClaimedEvent>): Promise<void> => {
      await handlers.handle(job.data.eventType, job.data.payload);
      await dispatcher.markDispatched(job.data.id);
      // 站內通知已 commit → 交由 line-push 佇列 best-effort 推播（PushNotificationService 過濾重點事件）。
      await pushQueue.add(
        job.data.eventType,
        { eventType: job.data.eventType, payload: job.data.payload },
        { attempts: PUSH_ATTEMPTS, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: true, removeOnFail: false },
      );
    },
    { connection },
  );

  worker.on('ready', () => console.log('[worker] ready — connected to Redis'));
  worker.on('completed', (job: Job<ClaimedEvent>) =>
    console.log(`[worker] dispatched event=${job.data.eventType} id=${job.data.id}`),
  );
  worker.on('failed', (job: Job<ClaimedEvent> | undefined, err: Error) => {
    console.error(`[worker] handler failed event=${job?.data?.eventType} id=${job?.data?.id}: ${err.message}`);
    // 重試耗盡 → 標 FAILED（BullMQ failed set 作 DLQ 保留原 job）。
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void dispatcher.markFailed(job.data.id);
    }
  });

  // LINE 推播 consumer（best-effort + BullMQ 重試;失敗進 failed set 作 DLQ）。
  const pushWorker = new Worker<PushJob>(
    LINE_PUSH_QUEUE,
    async (job: Job<PushJob>): Promise<void> => {
      await pushService.push(job.data.eventType, job.data.payload);
    },
    { connection },
  );
  pushWorker.on('failed', (job: Job<PushJob> | undefined, err: Error) => {
    console.error(`[worker] LINE push failed event=${job?.data?.eventType}: ${err.message}`);
  });

  // out-of-band 稽核 consumer（ADR-005 類別二）：INSERT 進 AuditLog（append-only）。
  // job.data = AuditEntry（API 端 AuditEnqueuer 送出）。丟出 → BullMQ 重試;耗盡進 failed set 作 DLQ。
  const auditWorker = new Worker<AuditEntry>(
    AUDIT_QUEUE,
    async (job: Job<AuditEntry>): Promise<void> => {
      await auditService.recordStandalone(job.data);
    },
    { connection },
  );
  auditWorker.on('failed', (job: Job<AuditEntry> | undefined, err: Error) => {
    console.error(
      `[worker] audit write failed action=${job?.data?.action} result=${job?.data?.result}: ${err.message}`,
    );
  });

  // 啟動 reaper：退回上次遺留的 PROCESSING（崩潰復原）。
  const reset = await dispatcher.resetStaleProcessing();
  if (reset > 0) {
    console.log(`[worker] reset ${reset} stale PROCESSING → PENDING`);
  }

  // Outbox poller：認領 PENDING → enqueue（jobId=outbox.id，重放/併發皆去重）。
  const poll = async (): Promise<void> => {
    try {
      const batch = await dispatcher.claimBatch();
      for (const ev of batch) {
        await queue.add(ev.eventType, ev, {
          jobId: ev.id,
          attempts: MAX_ATTEMPTS,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: true,
          removeOnFail: false,
        });
      }
    } catch (err) {
      console.error(`[worker] poll error: ${(err as Error).message}`);
    }
  };

  setInterval(() => {
    void poll();
  }, POLL_INTERVAL_MS);
  void poll();

  console.log('[worker] Sproutin outbox dispatcher started');
}

void bootstrap();
