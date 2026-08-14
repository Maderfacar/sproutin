import { AuditService } from './audit.service';

// 驗證 transactional audit 映射（ADR-005 類別一）——mocked tx client，不需 DB。
type TxMock = { auditLog: { create: jest.Mock } };

function emptyTx(): TxMock {
  return { auditLog: { create: jest.fn(async () => ({})) } };
}

describe('AuditService.record', () => {
  it('在傳入的 tx 上寫入 AuditLog（誰/action/資源/結果）', async () => {
    const tx = emptyTx();
    const service = new AuditService();

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
    const service = new AuditService();

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
