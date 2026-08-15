import { AuditService } from './audit.service';
import type { PrismaService } from '../prisma/prisma.service';

// 驗證稽核欄位映射（ADR-005）——mocked client，不需 DB。
type TxMock = { auditLog: { create: jest.Mock } };

function emptyTx(): TxMock {
  return { auditLog: { create: jest.fn(async () => ({})) } };
}

// recordStandalone 用的 mock PrismaService（只需 auditLog.create）。
function prismaMock(): { prisma: PrismaService; create: jest.Mock } {
  const create = jest.fn(async () => ({}));
  const prisma = { auditLog: { create } } as unknown as PrismaService;
  return { prisma, create };
}

describe('AuditService.record', () => {
  it('在傳入的 tx 上寫入 AuditLog（誰/action/資源/結果）', async () => {
    const tx = emptyTx();
    const service = new AuditService(prismaMock().prisma);

    await service.record(tx as unknown as never, {
      actorUserId: 'u-teacher',
      actorRole: 'TEACHER',
      action: 'leave.approve',
      resourceType: 'Leave',
      resourceId: 'leave-1',
      result: 'SUCCESS',
      metadata: { from: 'PENDING', to: 'APPROVED' },
    });

    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'u-teacher',
        actorRole: 'TEACHER',
        action: 'leave.approve',
        resourceType: 'Leave',
        resourceId: 'leave-1',
        result: 'SUCCESS',
        metadata: { from: 'PENDING', to: 'APPROVED' },
      }),
    });
  });

  it('選填欄位缺省 → 傳 undefined（不寫入 null）', async () => {
    const tx = emptyTx();
    const service = new AuditService(prismaMock().prisma);

    await service.record(tx as unknown as never, {
      actorUserId: null,
      action: 'leave.submit',
      resourceType: 'Leave',
      resourceId: 'leave-2',
      result: 'SUCCESS',
    });

    const arg = tx.auditLog.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.actorUserId).toBeUndefined();
    expect(arg.data.actorRole).toBeUndefined();
    expect(arg.data.metadata).toBeUndefined();
  });
});

describe('AuditService.recordStandalone', () => {
  it('out-of-band：以 PrismaService 直接 INSERT（無 tx）', async () => {
    const { prisma, create } = prismaMock();
    const service = new AuditService(prisma);

    await service.recordStandalone({
      actorUserId: 'u-teacher',
      actorRole: 'TEACHER',
      action: 'access.denied',
      resourceType: 'students',
      resourceId: 'stu-1',
      result: 'DENIED',
      metadata: { reason: 'out_of_scope' },
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'access.denied',
        resourceType: 'students',
        result: 'DENIED',
      }),
    });
  });
});
