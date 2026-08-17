import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import { AuditService } from '../core/audit/audit.service';
import { BusSettingsService } from './bus-settings.service';
import type { BusActor } from './bus.types';

// 驗證：下午順序預設倒過來、園長排過下午之後不再被自動沖掉、
// 刪除保護（有紀錄的路線 / 還有孩子掛著的接送點）、接送點必須屬於同一條路線、
// 隨車老師只列得到自己那條車。

type TxMock = {
  busRoute: { create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  busPoint: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
  busAssignment: { upsert: jest.Mock; delete: jest.Mock; deleteMany: jest.Mock };
  auditLog: { create: jest.Mock };
};

type PrismaMock = {
  busRoute: { findMany: jest.Mock; findUnique: jest.Mock };
  busPoint: { findMany: jest.Mock; findUnique: jest.Mock };
  busAssignment: { findMany: jest.Mock; findUnique: jest.Mock; count: jest.Mock };
  busRide: { count: jest.Mock };
  $transaction: jest.Mock;
};

const role = (r: AuthUser['roles'][number]['role']) => ({
  role: r,
  scopeType: 'SCHOOL' as const,
  scopeId: null,
});

const owner: BusActor = { id: 'u-owner', roles: [role('OWNER')] };
const busTeacher: BusActor = { id: 'u-bus', roles: [role('BUS_TEACHER')] };

const point = (id: string, orderAm: number, orderPm: number) => ({
  id,
  routeId: 'route-1',
  name: id,
  address: null,
  orderAm,
  orderPm,
  etaAm: null,
  etaPm: null,
});

function makeTx(): TxMock {
  return {
    busRoute: {
      create: jest.fn(async () => ({ id: 'route-1', name: '東區線' })),
      update: jest.fn(async () => ({ id: 'route-1', name: '東區線', points: [] })),
      delete: jest.fn(async () => ({})),
    },
    busPoint: {
      create: jest.fn(async () => point('p-new', 0, 0)),
      update: jest.fn(async () => point('p-new', 0, 0)),
      delete: jest.fn(async () => ({})),
      deleteMany: jest.fn(async () => ({ count: 0 })),
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      findUniqueOrThrow: jest.fn(async () => point('p-new', 0, 0)),
    },
    busAssignment: {
      upsert: jest.fn(async () => ({ studentId: 'stu-1', routeId: 'route-1' })),
      delete: jest.fn(async () => ({})),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock): PrismaMock {
  return {
    busRoute: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => ({
        id: 'route-1',
        name: '東區線',
        afternoonCustomOrder: false,
      })),
    },
    busPoint: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
    busAssignment: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      count: jest.fn(async () => 0),
    },
    busRide: { count: jest.fn(async () => 0) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeService(prisma: PrismaMock): BusSettingsService {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return new BusSettingsService(prisma as any, new AuditService(prisma as any));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

describe('BusSettingsService — 路線', () => {
  it('隨車老師只列得到自己被指派、且啟用中的路線', async () => {
    const prisma = makePrisma(makeTx());
    const service = makeService(prisma);

    await service.listRoutes(busTeacher);
    expect(prisma.busRoute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { busTeacherId: 'u-bus', isActive: true } }),
    );
  });

  it('園長列得到全部路線（含停用的，否則他無從復原）', async () => {
    const prisma = makePrisma(makeTx());
    const service = makeService(prisma);

    await service.listRoutes(owner);
    expect(prisma.busRoute.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('已經有乘車紀錄的路線不給刪，請改停用', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busRide.count = jest.fn(async () => 3);
    const service = makeService(prisma);

    await expect(service.deleteRoute(owner, 'route-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('沒有紀錄的路線可以刪，連同接送點與名單一起清掉', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const service = makeService(prisma);

    await expect(service.deleteRoute(owner, 'route-1')).resolves.toEqual({ deleted: true });
    expect(tx.busAssignment.deleteMany).toHaveBeenCalled();
    expect(tx.busPoint.deleteMany).toHaveBeenCalled();
  });

  it('路線不存在時回 404', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busRoute.findUnique = jest.fn(async () => null);
    const service = makeService(prisma);

    await expect(service.updateRoute(owner, 'nope', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('BusSettingsService — 接送點順序', () => {
  it('新增接送點後，下午順序自動變成上午的倒序', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    tx.busPoint.count = jest.fn(async () => 2);
    tx.busPoint.findMany = jest.fn(async () => [
      { id: 'p1' },
      { id: 'p2' },
      { id: 'p3' },
    ]);
    const service = makeService(prisma);

    await service.createPoint(owner, { routeId: 'route-1', name: '吳家' });

    const pmUpdates = tx.busPoint.update.mock.calls.filter((c) => 'orderPm' in c[0].data);
    expect(pmUpdates.map((c) => [c[0].where.id, c[0].data.orderPm])).toEqual([
      ['p1', 2],
      ['p2', 1],
      ['p3', 0],
    ]);
  });

  it('園長已手動排過下午 → 新增接送點不再自動重排（不沖掉他排好的例外）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busRoute.findUnique = jest.fn(async () => ({
      id: 'route-1',
      name: '東區線',
      afternoonCustomOrder: true,
    }));
    const service = makeService(prisma);

    await service.createPoint(owner, { routeId: 'route-1', name: '吳家' });
    expect(tx.busPoint.update).not.toHaveBeenCalled();
  });

  it('重排下午順序會把該路線標成「下午自訂」', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busPoint.findMany = jest.fn(async () => [{ id: 'p1' }, { id: 'p2' }]);
    const service = makeService(prisma);

    await service.reorderPoints(owner, {
      routeId: 'route-1',
      direction: 'AFTERNOON',
      pointIds: ['p2', 'p1'],
    });
    expect(tx.busRoute.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { afternoonCustomOrder: true } }),
    );
  });

  it('重排上午順序時，尚未自訂的下午跟著倒過來', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busPoint.findMany = jest.fn(async () => [{ id: 'p1' }, { id: 'p2' }]);
    tx.busPoint.findMany = jest.fn(async () => [{ id: 'p2' }, { id: 'p1' }]);
    const service = makeService(prisma);

    await service.reorderPoints(owner, {
      routeId: 'route-1',
      direction: 'MORNING',
      pointIds: ['p2', 'p1'],
    });
    const pmUpdates = tx.busPoint.update.mock.calls.filter((c) => 'orderPm' in c[0].data);
    expect(pmUpdates).toHaveLength(2);
    expect(tx.busRoute.update).not.toHaveBeenCalled();
  });

  it('送來的順序清單與實際接送點對不起來時拒絕（避免只排了一半）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busPoint.findMany = jest.fn(async () => [{ id: 'p1' }, { id: 'p2' }]);
    const service = makeService(prisma);

    await expect(
      service.reorderPoints(owner, {
        routeId: 'route-1',
        direction: 'MORNING',
        pointIds: ['p1'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BusSettingsService — 接送點刪除與名單', () => {
  it('還有孩子掛在上面的接送點不給刪', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busPoint.findUnique = jest.fn(async () => ({ id: 'p1', routeId: 'route-1' }));
    prisma.busAssignment.count = jest.fn(async () => 2);
    const service = makeService(prisma);

    await expect(service.deletePoint(owner, 'p1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('沒人用的接送點刪得掉，並把剩下的序號補回連續', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busPoint.findUnique = jest.fn(async () => ({ id: 'p1', routeId: 'route-1' }));
    tx.busPoint.findMany = jest.fn(async () => [{ id: 'p2' }, { id: 'p3' }]);
    const service = makeService(prisma);

    await expect(service.deletePoint(owner, 'p1')).resolves.toEqual({ deleted: true });
    const amUpdates = tx.busPoint.update.mock.calls.filter((c) => 'orderAm' in c[0].data);
    expect(amUpdates.map((c) => c[0].data.orderAm)).toEqual([0, 1]);
  });

  it('接送點不屬於該路線時拒絕掛名單（不可能在別條線上車）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busPoint.findUnique = jest.fn(async () => ({ routeId: 'route-other' }));
    const service = makeService(prisma);

    await expect(
      service.saveAssignment(owner, {
        studentId: 'stu-1',
        routeId: 'route-1',
        morningPointId: 'p-other',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('名單以學生為 key upsert，上下午預設都搭', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const service = makeService(prisma);

    await service.saveAssignment(owner, { studentId: 'stu-1', routeId: 'route-1' });
    const args = tx.busAssignment.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ studentId: 'stu-1' });
    expect(args.create.ridesMorning).toBe(true);
    expect(args.create.ridesAfternoon).toBe(true);
  });

  it('稽核不記學生姓名，只記 id 與路線', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const service = makeService(prisma);

    await service.saveAssignment(owner, { studentId: 'stu-1', routeId: 'route-1' });
    const audit = tx.auditLog.create.mock.calls[0][0].data;
    expect(audit.action).toBe('bus.assignment.save');
    expect(audit.metadata).toEqual(
      expect.objectContaining({ routeId: 'route-1', ridesMorning: true }),
    );
  });
});
