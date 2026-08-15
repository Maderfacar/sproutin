import { AuditEnqueuer } from './audit-enqueuer.service';
import type { AuditEntry } from './audit.service';

const SAMPLE: AuditEntry = {
  actorUserId: 'u',
  action: 'access.denied',
  resourceType: 'students',
  resourceId: 's1',
  result: 'DENIED',
  metadata: { reason: 'out_of_scope' },
};

// 降級路徑契約（ADR-005 last-resort）：無 REDIS_URL → 不連線、不建佇列、enqueue 不丟出。
describe('AuditEnqueuer (degrade path)', () => {
  const original = process.env.REDIS_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = original;
    }
  });

  it('無 REDIS_URL → enabled=false', () => {
    delete process.env.REDIS_URL;
    const enqueuer = new AuditEnqueuer();
    expect(enqueuer.enabled).toBe(false);
  });

  it('無 REDIS_URL → enqueue 走降級記 log，不丟出', async () => {
    delete process.env.REDIS_URL;
    const enqueuer = new AuditEnqueuer();
    // 靜音降級 log（避免測試輸出噪音）。
    const logger = enqueuer['logger'] as { error: (m: string) => void };
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    await expect(enqueuer.enqueue(SAMPLE)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0]?.[0])).toContain('audit-fallback');

    // 未建立佇列/連線 → onModuleDestroy 為 no-op。
    await expect(enqueuer.onModuleDestroy()).resolves.toBeUndefined();
  });
});
