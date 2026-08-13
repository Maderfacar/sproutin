import 'reflect-metadata';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';

// Sproutin Worker entrypoint（同一 image、不同 CMD，§20 / docs/04）。
// 本階段（Phase 5 後端部署）：只做「部署自我測試」——連線 Redis 並處理一個 ping job，
// 證明 Worker → Redis job 流程可用。**非業務邏輯。**
// TODO(Phase 6+): Outbox dispatcher、通知 / LINE Push、out-of-band audit consumer（ADR-005）。

const HEALTH_QUEUE = 'health';

async function bootstrap(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    // eslint-disable-next-line no-console
    console.error('[worker] REDIS_URL 未設定，無法連線 Redis');
    process.exit(1);
  }

  // BullMQ 要求 maxRetriesPerRequest = null。
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker(
    HEALTH_QUEUE,
    async (job: Job): Promise<{ ok: true }> => {
      // eslint-disable-next-line no-console
      console.log(`[worker] processed job name=${job.name} id=${job.id ?? '?'}`);
      return { ok: true };
    },
    { connection },
  );

  worker.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log('[worker] ready — connected to Redis');
  });
  worker.on('completed', (job: Job) => {
    // eslint-disable-next-line no-console
    console.log(`[worker] self-test OK — job ${job.name} completed`);
  });
  worker.on('failed', (_job: Job | undefined, err: Error) => {
    // eslint-disable-next-line no-console
    console.error(`[worker] job failed: ${err.message}`);
  });

  // 啟動時自送一個 ping job，端到端驗證 Redis 佇列。
  const queue = new Queue(HEALTH_QUEUE, { connection });
  await queue.add('ping', { at: new Date().toISOString() });

  // eslint-disable-next-line no-console
  console.log('[worker] Sproutin worker started; enqueued self-test ping');
}

void bootstrap();
