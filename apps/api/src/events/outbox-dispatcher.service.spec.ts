import { OutboxDispatcherService } from './outbox-dispatcher.service';

// 驗證 Outbox claim/mark 邏輯（mocked Prisma，不需 DB/Redis）。

type PrismaMock = {
  outboxEvent: { findMany: jest.Mock; updateMany: jest.Mock; update: jest.Mock };
};

function makePrisma(): PrismaMock {
  return {
    outboxEvent: {
      findMany: jest.fn(async () => []),
      updateMany: jest.fn(async () => ({ count: 1 })),
      update: jest.fn(async () => ({})),
    },
  };
}

function makeService(prisma: PrismaMock): OutboxDispatcherService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new OutboxDispatcherService(prisma as any);
}

describe('OutboxDispatcherService.claimBatch', () => {
  it('撈 PENDING → 以 status guard 翻 PROCESSING;count=1 才認領', async () => {
    const prisma = makePrisma();
    prisma.outboxEvent.findMany.mockResolvedValue([
      { id: 'e1', eventType: 'LeaveApproved', payload: { leaveId: 'l1' } },
      { id: 'e2', eventType: 'LeaveCancelled', payload: { leaveId: 'l2' } },
    ]);
    const service = makeService(prisma);

    const claimed = await service.claimBatch();

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } }),
    );
    // 每列各一次 status-guard 更新
    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: 'e1', status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });
    expect(claimed.map((c) => c.id)).toEqual(['e1', 'e2']);
  });

  it('status guard count=0（他人先認領）→ 不認領該列', async () => {
    const prisma = makePrisma();
    prisma.outboxEvent.findMany.mockResolvedValue([
      { id: 'e1', eventType: 'LeaveApproved', payload: {} },
    ]);
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 0 });
    const service = makeService(prisma);

    const claimed = await service.claimBatch();
    expect(claimed).toEqual([]);
  });
});

describe('OutboxDispatcherService mark', () => {
  it('markDispatched → status=DISPATCHED + dispatchedAt', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);
    await service.markDispatched('e1');
    const arg = prisma.outboxEvent.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'e1' });
    expect(arg.data.status).toBe('DISPATCHED');
    expect(arg.data.dispatchedAt).toBeInstanceOf(Date);
  });

  it('markFailed → status=FAILED', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);
    await service.markFailed('e1');
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'FAILED' },
    });
  });

  it('resetStaleProcessing → PROCESSING 退回 PENDING，回傳筆數', async () => {
    const prisma = makePrisma();
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 3 });
    const service = makeService(prisma);
    const n = await service.resetStaleProcessing();
    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { status: 'PROCESSING' },
      data: { status: 'PENDING' },
    });
    expect(n).toBe(3);
  });
});
