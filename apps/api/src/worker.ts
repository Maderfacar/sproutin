import 'reflect-metadata';

// Sproutin Worker entrypoint（骨架，同一 image、不同 CMD，§20 / docs/04）。
// 之後承載：
//  - Outbox dispatcher（§4）
//  - BullMQ processors：通知 / LINE Push
//  - out-of-band audit durable queue consumer（ADR-005：BullMQ + DLQ）
async function bootstrap(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[worker] Sproutin worker starting (skeleton)');
  // TODO(vertical-slice): 初始化 BullMQ workers 與 Outbox dispatcher
}

void bootstrap();
