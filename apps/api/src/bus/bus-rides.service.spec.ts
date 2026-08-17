import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import { AuditService } from '../core/audit/audit.service';
import { BusRidesService } from './bus-rides.service';
import type { BusActor } from './bus.types';

// 驗證：路線層授權（隨車老師只能碰自己那條車）、請假的孩子不進名單、
// 上/下車寫入（每生每日每方向一列）、位置抓不到照樣運作、誤觸復原會把時間清乾淨、
// 前端傳來的名單不被信任、家長只看得到自己小孩。

type TxMock = {
  busRide: { upsert: jest.Mock };
  auditLog: { create: jest.Mock };
};

type PrismaMock = {
  busPoint: { findMany: jest.Mock };
  busAssignment: { findMany: jest.Mock; findUnique: jest.Mock };
  busRide: { findMany: jest.Mock };
  busRoute: { findUnique: jest.Mock };
  attendance: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

const role = (r: AuthUser['roles'][number]['role']) => ({
  role: r,
  scopeType: 'SCHOOL' as const,
  scopeId: null,
});

const owner: BusActor = { id: 'u-owner', roles: [role('OWNER')] };
const busTeacher: BusActor = { id: 'u-bus', roles: [role('BUS_TEACHER')] };
const otherBusTeacher: BusActor = { id: 'u-other', roles: [role('BUS_TEACHER')] };
const parent: BusActor = { id: 'u-parent', roles: [role('PARENT')] };

const DATE = '2026-08-18T00:00:00.000Z';

function makeTx(): TxMock {
  return {
    busRide: {
      upsert: jest.fn(async () => ({ id: 'ride-1', studentId: 'stu-1', status: 'BOARDED' })),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock): PrismaMock {
  return {
    busPoint: { findMany: jest.fn(async () => []) },
    busAssignment: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
    busRide: { findMany: jest.fn(async () => []) },
    busRoute: { findUnique: jest.fn(async () => ({ id: 'route-1', busTeacherId: 'u-bus' })) },
    attendance: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeService(prisma: PrismaMock, scope = { canAccessStudent: jest.fn(async () => true) }): BusRidesService {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return new BusRidesService(prisma as any, scope as any, new AuditService(prisma as any));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

const assignmentRow = (studentId: string, name: string) => ({
  studentId,
  morningPointId: 'point-1',
  afternoonPointId: 'point-2',
  student: { name, classId: 'class-sun' },
});

describe('BusRidesService — 授權', () => {
  it('隨車老師打不開別條路線的名單', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busRoute.findUnique = jest.fn(async () => ({ id: 'route-1', busTeacherId: 'u-bus' }));
    const service = makeService(prisma);

    await expect(
      service.roster(otherBusTeacher, { routeId: 'route-1', date: DATE, direction: 'MORNING' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('隨車老師打得開自己那條路線', async () => {
    const prisma = makePrisma(makeTx());
    const service = makeService(prisma);

    const roster = await service.roster(busTeacher, {
      routeId: 'route-1',
      date: DATE,
      direction: 'MORNING',
    });
    expect(roster.routeId).toBe('route-1');
  });

  it('園長不受路線指派限制', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busRoute.findUnique = jest.fn(async () => ({ id: 'route-1', busTeacherId: 'u-someone' }));
    const service = makeService(prisma);

    await expect(
      service.roster(owner, { routeId: 'route-1', date: DATE, direction: 'MORNING' }),
    ).resolves.toBeDefined();
  });

  it('路線不存在回 404，不是 403（不要讓人猜不出哪裡錯）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busRoute.findUnique = jest.fn(async () => null);
    const service = makeService(prisma);

    await expect(
      service.roster(owner, { routeId: 'nope', date: DATE, direction: 'MORNING' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('BusRidesService — 名單', () => {
  it('請假（Attendance=LEAVE）的孩子不出現在名單上，但會被計入 onLeaveCount', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busAssignment.findMany = jest.fn(async () => [
      assignmentRow('stu-1', '林小恩'),
      assignmentRow('stu-2', '陳小安'),
    ]);
    prisma.attendance.findMany = jest.fn(async () => [{ studentId: 'stu-2' }]);
    const service = makeService(prisma);

    const roster = await service.roster(owner, {
      routeId: 'route-1',
      date: DATE,
      direction: 'MORNING',
    });

    expect(roster.entries.map((e) => e.studentId)).toEqual(['stu-1']);
    expect(roster.onLeaveCount).toBe(1);
  });

  it('請假事件寫下的 BusRide(ABSENT/LEAVE_EVENT) 同樣把孩子移出名單', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busAssignment.findMany = jest.fn(async () => [assignmentRow('stu-1', '林小恩')]);
    prisma.busRide.findMany = jest.fn(async () => [
      { studentId: 'stu-1', status: 'ABSENT', source: 'LEAVE_EVENT', direction: 'MORNING' },
    ]);
    const service = makeService(prisma);

    const roster = await service.roster(owner, {
      routeId: 'route-1',
      date: DATE,
      direction: 'MORNING',
    });
    expect(roster.entries).toHaveLength(0);
    expect(roster.onLeaveCount).toBe(1);
  });

  it('老師手動標「今日未搭」的孩子仍留在名單上（點錯了要看得到才改得回來）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busAssignment.findMany = jest.fn(async () => [assignmentRow('stu-1', '林小恩')]);
    prisma.busRide.findMany = jest.fn(async () => [
      { studentId: 'stu-1', status: 'ABSENT', source: 'MANUAL', direction: 'MORNING' },
    ]);
    const service = makeService(prisma);

    const roster = await service.roster(owner, {
      routeId: 'route-1',
      date: DATE,
      direction: 'MORNING',
    });
    expect(roster.entries).toHaveLength(1);
    expect(roster.onLeaveCount).toBe(0);
  });

  it('上午名單只取有搭上學車的孩子', async () => {
    const prisma = makePrisma(makeTx());
    const service = makeService(prisma);

    await service.roster(owner, { routeId: 'route-1', date: DATE, direction: 'AFTERNOON' });
    expect(prisma.busAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ridesAfternoon: true }) }),
    );
  });
});

describe('BusRidesService — 點名', () => {
  it('上車寫入時間與位置，並掛上該方向的接送點', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busAssignment.findMany = jest.fn(async () => [
      { studentId: 'stu-1', morningPointId: 'point-1', afternoonPointId: 'point-2' },
    ]);
    const service = makeService(prisma);

    await service.board(busTeacher, {
      routeId: 'route-1',
      date: DATE,
      direction: 'MORNING',
      studentIds: ['stu-1'],
      lat: 25.03,
      lng: 121.56,
    });

    const args = tx.busRide.upsert.mock.calls[0][0];
    expect(args.create.status).toBe('BOARDED');
    expect(args.create.pointId).toBe('point-1');
    expect(args.create.boardLat).toBe(25.03);
    expect(args.update.source).toBe('MANUAL');
  });

  it('抓不到位置照樣點得下去，位置留 null（不假裝有）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busAssignment.findMany = jest.fn(async () => [
      { studentId: 'stu-1', morningPointId: 'point-1', afternoonPointId: null },
    ]);
    const service = makeService(prisma);

    await service.board(busTeacher, {
      routeId: 'route-1',
      date: DATE,
      direction: 'MORNING',
      studentIds: ['stu-1'],
    });

    const args = tx.busRide.upsert.mock.calls[0][0];
    expect(args.create.status).toBe('BOARDED');
    expect(args.create.boardLat).toBeNull();
    expect(args.create.boardLng).toBeNull();
  });

  it('一次多人下車（車到校一鍵）逐人各一列', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busAssignment.findMany = jest.fn(async () => [
      { studentId: 'stu-1', morningPointId: 'p1', afternoonPointId: null },
      { studentId: 'stu-2', morningPointId: 'p1', afternoonPointId: null },
    ]);
    const service = makeService(prisma);

    await service.alight(busTeacher, {
      routeId: 'route-1',
      date: DATE,
      direction: 'MORNING',
      studentIds: ['stu-1', 'stu-2'],
    });

    expect(tx.busRide.upsert).toHaveBeenCalledTimes(2);
    expect(tx.busRide.upsert.mock.calls[0][0].create.status).toBe('ALIGHTED');
  });

  it('誤觸復原會把上下車時間與位置一併清掉', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busAssignment.findMany = jest.fn(async () => [
      { studentId: 'stu-1', morningPointId: 'p1', afternoonPointId: null },
    ]);
    const service = makeService(prisma);

    await service.undo(busTeacher, {
      routeId: 'route-1',
      date: DATE,
      direction: 'MORNING',
      studentIds: ['stu-1'],
    });

    const update = tx.busRide.upsert.mock.calls[0][0].update;
    expect(update.status).toBe('SCHEDULED');
    expect(update.boardedAt).toBeNull();
    expect(update.boardLat).toBeNull();
    expect(update.alightedAt).toBeNull();
  });

  it('名單上沒有的孩子一律拒絕（前端傳來的名單不信任）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busAssignment.findMany = jest.fn(async () => []);
    const service = makeService(prisma);

    await expect(
      service.board(busTeacher, {
        routeId: 'route-1',
        date: DATE,
        direction: 'MORNING',
        studentIds: ['stu-x'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('稽核只記數量與有沒有位置，不記學生姓名', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.busAssignment.findMany = jest.fn(async () => [
      { studentId: 'stu-1', morningPointId: 'p1', afternoonPointId: null },
    ]);
    const service = makeService(prisma);

    await service.board(busTeacher, {
      routeId: 'route-1',
      date: DATE,
      direction: 'MORNING',
      studentIds: ['stu-1'],
    });

    const audit = tx.auditLog.create.mock.calls[0][0].data;
    expect(audit.action).toBe('bus.ride.boarded');
    expect(audit.metadata).toEqual(
      expect.objectContaining({ count: 1, direction: 'MORNING', hasLocation: false }),
    );
    expect(JSON.stringify(audit.metadata)).not.toContain('林小恩');
  });
});

describe('BusRidesService — 家長端', () => {
  it('看別人家的小孩會被擋下來', async () => {
    const prisma = makePrisma(makeTx());
    const service = makeService(prisma, { canAccessStudent: jest.fn(async () => false) });

    await expect(service.myBus(parent, 'stu-other')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('沒搭娃娃車的孩子回一份空狀態，不是錯誤', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busAssignment.findUnique = jest.fn(async () => null);
    const service = makeService(prisma);

    const view = await service.myBus(parent, 'stu-1');
    expect(view.routeName).toBeNull();
    expect(view.ridesMorning).toBe(false);
    expect(view.morning).toBeNull();
  });

  it('有搭車時帶回路線、接送點名稱與上下午兩筆紀錄', async () => {
    const prisma = makePrisma(makeTx());
    prisma.busAssignment.findUnique = jest.fn(async () => ({
      route: { name: '東區線', morningDepart: '07:20', afternoonDepart: '16:30' },
      morningPoint: { name: '林家' },
      afternoonPoint: { name: '阿嬤家' },
      ridesMorning: true,
      ridesAfternoon: true,
    }));
    prisma.busRide.findMany = jest.fn(async () => [
      { direction: 'MORNING', status: 'BOARDED' },
      { direction: 'AFTERNOON', status: 'SCHEDULED' },
    ]);
    const service = makeService(prisma);

    const view = await service.myBus(parent, 'stu-1');
    expect(view.routeName).toBe('東區線');
    expect(view.morningPointName).toBe('林家');
    expect(view.afternoonPointName).toBe('阿嬤家');
    expect(view.morning?.status).toBe('BOARDED');
    expect(view.afternoon?.status).toBe('SCHEDULED');
  });
});
