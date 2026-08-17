import { AuditService } from '../core/audit/audit.service';
import { BusEventHandler } from './bus-event.handler';

// 驗證「請假自動移出乘車名單」這條訂閱：
//   - 沒搭車的孩子不受影響（絕大多數情況）
//   - 只在他實際有搭的方向產生紀錄
//   - 老師已經手動記過的那一趟不被事件覆寫（與 Attendance 的 override 語意一致）
//   - 請假取消時精準還原，且不碰老師手動記的紀錄

type TxMock = {
  busRide: { findUnique: jest.Mock; upsert: jest.Mock; findMany: jest.Mock; deleteMany: jest.Mock };
  auditLog: { create: jest.Mock };
};

type PrismaMock = {
  busAssignment: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

function makeTx(): TxMock {
  return {
    busRide: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async () => ({ id: 'ride-1' })),
      findMany: jest.fn(async () => []),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock): PrismaMock {
  return {
    busAssignment: {
      findUnique: jest.fn(async () => ({
        routeId: 'route-1',
        ridesMorning: true,
        ridesAfternoon: true,
      })),
    },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeHandler(prisma: PrismaMock): BusEventHandler {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return new BusEventHandler(prisma as any, new AuditService(prisma as any));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

const approved = {
  leaveId: 'leave-1',
  studentId: 'stu-1',
  dateFrom: '2026-08-18T00:00:00.000Z',
  dateTo: '2026-08-18T00:00:00.000Z',
};

describe('BusEventHandler — 請假核准', () => {
  it('沒搭娃娃車的孩子完全不受影響', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busAssignment.findUnique = jest.fn(async () => null);
    const handler = makeHandler(prisma);

    await handler.onLeaveApproved(approved);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('有搭車 → 當日上下午各標一筆「今日未搭」，來源記為請假事件', async () => {
    const tx = makeTx();
    const handler = makeHandler(makePrisma(tx));

    await handler.onLeaveApproved(approved);
    expect(tx.busRide.upsert).toHaveBeenCalledTimes(2);
    const first = tx.busRide.upsert.mock.calls[0][0];
    expect(first.create.status).toBe('ABSENT');
    expect(first.create.source).toBe('LEAVE_EVENT');
    expect(first.create.sourceRef).toBe('leave-1');
  });

  it('只搭上學車的孩子只被標上午那一筆', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busAssignment.findUnique = jest.fn(async () => ({
      routeId: 'route-1',
      ridesMorning: true,
      ridesAfternoon: false,
    }));
    const handler = makeHandler(prisma);

    await handler.onLeaveApproved(approved);
    expect(tx.busRide.upsert).toHaveBeenCalledTimes(1);
    expect(tx.busRide.upsert.mock.calls[0][0].create.direction).toBe('MORNING');
  });

  it('老師已手動記過的那一趟不被覆寫（孩子可能早上還是上了車）', async () => {
    const tx = makeTx();
    tx.busRide.findUnique = jest.fn(async () => ({ id: 'ride-1', source: 'MANUAL' }));
    const handler = makeHandler(makePrisma(tx));

    await handler.onLeaveApproved(approved);
    expect(tx.busRide.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create.mock.calls[0][0].data.metadata).toEqual(
      expect.objectContaining({ removed: 0, skipped: 2 }),
    );
  });

  it('多日請假逐日處理', async () => {
    const tx = makeTx();
    const handler = makeHandler(makePrisma(tx));

    await handler.onLeaveApproved({
      ...approved,
      dateTo: '2026-08-20T00:00:00.000Z',
    });
    expect(tx.busRide.upsert).toHaveBeenCalledTimes(6);
  });

  it('稽核不記學生姓名，只記 id 與筆數', async () => {
    const tx = makeTx();
    const handler = makeHandler(makePrisma(tx));

    await handler.onLeaveApproved(approved);
    const audit = tx.auditLog.create.mock.calls[0][0].data;
    expect(audit.action).toBe('bus.roster.leave_removed');
    expect(audit.actorRole).toBe('system');
    expect(audit.metadata).toEqual({ studentId: 'stu-1', removed: 2, skipped: 0 });
  });
});

describe('BusEventHandler — 請假取消 / 駁回', () => {
  it('只刪除由請假事件產生的紀錄，孩子精準回到名單', async () => {
    const tx = makeTx();
    tx.busRide.findMany = jest.fn(async () => [{ id: 'ride-1' }, { id: 'ride-2' }]);
    const handler = makeHandler(makePrisma(tx));

    await handler.onLeaveClosed('LeaveCancelled', { leaveId: 'leave-1', studentId: 'stu-1' });
    expect(tx.busRide.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sourceRef: 'leave-1', source: 'LEAVE_EVENT' } }),
    );
    expect(tx.busRide.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['ride-1', 'ride-2'] } },
    });
  });

  it('沒有可還原的紀錄時什麼都不做，也不寫稽核', async () => {
    const tx = makeTx();
    const handler = makeHandler(makePrisma(tx));

    await handler.onLeaveClosed('LeaveRejected', { leaveId: 'leave-1', studentId: 'stu-1' });
    expect(tx.busRide.deleteMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
