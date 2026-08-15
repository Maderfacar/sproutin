import { LeaveEventHandler } from './leave-event.handler';
import { RecipientsService } from './recipients.service';
import { NotificationService } from './notification.service';
import { AuditService } from '../core/audit/audit.service';

// 驗證 Step 3 核心正確性（mocked Prisma，不需 DB）：
//   投影 override 感知 / 回滾保留 override / 多日 / idempotent 重放 / 衝突浮現。

interface AttRow {
  id: string;
  source: 'MANUAL' | 'LEAVE_EVENT';
}

interface TxOpts {
  existing?: AttRow | null; // attendance.findUnique（逐日）回傳
  derived?: Array<{ id: string }>; // sourceRef+LEAVE_EVENT 的列（回滾對象）
  overridden?: Array<{ date: Date }>; // derivedFrom+MANUAL 的列（已 override）
}

function makeTx(opts: TxOpts = {}) {
  return {
    attendance: {
      findUnique: jest.fn(async () => opts.existing ?? null),
      create: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
      // 依 where.source 分流：LEAVE_EVENT=回滾對象;MANUAL=已 override。
      findMany: jest.fn(async ({ where }: { where: { source?: string } }) => {
        if (where.source === 'LEAVE_EVENT') return opts.derived ?? [];
        if (where.source === 'MANUAL') return opts.overridden ?? [];
        return [];
      }),
      deleteMany: jest.fn(async () => ({ count: (opts.derived ?? []).length })),
    },
    auditLog: { create: jest.fn(async (_a: { data: { action: string } }) => ({})) },
    notification: {
      createMany: jest.fn(async (_a: { data: Array<{ userId: string; type: string }> }) => ({ count: 0 })),
    },
    student: { findUnique: jest.fn(async () => ({ classId: 'class-sun' })) },
    guardianship: { findMany: jest.fn(async () => [{ userId: 'u-parent' }]) },
    teacherAssignment: { findMany: jest.fn(async () => [{ userId: 'u-teacher' }]) },
    userRole: { findMany: jest.fn(async () => [{ userId: 'u-owner' }]) },
  };
}

type Tx = ReturnType<typeof makeTx>;

function makeHandler(tx: Tx): LeaveEventHandler {
  const prisma = {
    $transaction: jest.fn(async (cb: (t: Tx) => Promise<unknown>) => cb(tx)),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new LeaveEventHandler(prisma as any, new RecipientsService(), new NotificationService(), new AuditService());
}

const APPROVED = {
  leaveId: 'leave-1',
  studentId: 'stu-sun-1',
  dateFrom: '2026-08-10T00:00:00.000Z',
  dateTo: '2026-08-10T00:00:00.000Z',
};

// action 出現於任一 auditLog.create 呼叫
function auditActions(tx: Tx): string[] {
  return tx.auditLog.create.mock.calls.map((c) => c[0].data.action);
}
// type 出現於任一 notification.createMany 呼叫
function notifyTypes(tx: Tx): Array<string | undefined> {
  return tx.notification.createMany.mock.calls.map((c) => c[0].data[0]?.type);
}

describe('LeaveEventHandler.projectApproved', () => {
  it('當日無列 → 建 LEAVE_EVENT（sourceRef/derivedFrom=leaveId）+ audit(attendance.project) + 通知', async () => {
    const tx = makeTx({ existing: null });
    await makeHandler(tx).projectApproved(APPROVED);

    expect(tx.attendance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'stu-sun-1',
          status: 'LEAVE',
          source: 'LEAVE_EVENT',
          sourceRef: 'leave-1',
          derivedFrom: 'leave-1',
        }),
      }),
    );
    expect(auditActions(tx)).toContain('attendance.project');
    expect(notifyTypes(tx)).toContain('LeaveApproved');
  });

  it('多日（3 天）→ 逐日投影（3 次 create）', async () => {
    const tx = makeTx({ existing: null });
    await makeHandler(tx).projectApproved({
      ...APPROVED,
      dateFrom: '2026-08-10T00:00:00.000Z',
      dateTo: '2026-08-12T00:00:00.000Z',
    });
    expect(tx.attendance.create).toHaveBeenCalledTimes(3);
  });

  it('當日已 MANUAL（override）→ 不覆寫;發 override_conflict（audit + 通知）', async () => {
    const tx = makeTx({ existing: { id: 'att-m', source: 'MANUAL' } });
    await makeHandler(tx).projectApproved(APPROVED);

    expect(tx.attendance.create).not.toHaveBeenCalled();
    expect(tx.attendance.update).not.toHaveBeenCalled(); // 不觸碰 MANUAL 列
    expect(auditActions(tx)).toContain('attendance.override_conflict');
    expect(notifyTypes(tx)).toContain('attendance.override_conflict');
  });

  it('當日已 LEAVE_EVENT → 再投影（update，不新增列）= idempotent 重放', async () => {
    const tx = makeTx({ existing: { id: 'att-le', source: 'LEAVE_EVENT' } });
    await makeHandler(tx).projectApproved(APPROVED);

    expect(tx.attendance.create).not.toHaveBeenCalled();
    expect(tx.attendance.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'att-le' }, data: expect.objectContaining({ sourceRef: 'leave-1' }) }),
    );
  });
});

describe('LeaveEventHandler.rollback', () => {
  const CANCELLED = { leaveId: 'leave-1', studentId: 'stu-sun-1' };

  it('LeaveCancelled：刪除 LEAVE_EVENT sourceRef 列 + audit(attendance.rollback)', async () => {
    const tx = makeTx({ derived: [{ id: 'att-le1' }, { id: 'att-le2' }] });
    await makeHandler(tx).rollback('LeaveCancelled', CANCELLED);

    expect(tx.attendance.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['att-le1', 'att-le2'] } } });
    expect(auditActions(tx)).toContain('attendance.rollback');
  });

  it('已 override（MANUAL derivedFrom）→ 不刪除;發 override_conflict', async () => {
    const tx = makeTx({ derived: [], overridden: [{ date: new Date('2026-08-10T00:00:00.000Z') }] });
    await makeHandler(tx).rollback('LeaveCancelled', CANCELLED);

    expect(tx.attendance.deleteMany).not.toHaveBeenCalled();
    expect(auditActions(tx)).toContain('attendance.override_conflict');
    expect(notifyTypes(tx)).toContain('attendance.override_conflict');
  });

  it('LeaveRejected → 通知家長（guardians）', async () => {
    const tx = makeTx({ derived: [{ id: 'att-le1' }] });
    await makeHandler(tx).rollback('LeaveRejected', { leaveId: 'leave-1', studentId: 'stu-sun-1' });

    // 最後一筆通知為 LeaveRejected，收件人含家長
    const rejectCall = tx.notification.createMany.mock.calls.find((c) => c[0].data[0]?.type === 'LeaveRejected');
    expect(rejectCall).toBeDefined();
    const userIds = rejectCall![0].data.map((d) => d.userId);
    expect(userIds).toContain('u-parent');
  });
});
