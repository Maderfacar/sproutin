import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { todayKey } from '../events/day-key';
import type { AuthUser } from '@sproutin/shared';
import { AuditService } from '../core/audit/audit.service';
import { BookActor, CommunicationBookService } from './communication-book.service';

// 驗證：授權（自班 / 自己小孩）、家長只看得到已送出、7 天填寫窗、
// 點名即到校（同交易寫出缺勤 + 到校時間）、一鍵送出（只送已填、推播名單受限、稽核不含 PII）。

type TxMock = {
  communicationBookEntry: { findMany: jest.Mock; upsert: jest.Mock; updateMany: jest.Mock };
  attendance: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  outboxEvent: { create: jest.Mock };
  auditLog: { create: jest.Mock };
};

type PrismaMock = {
  communicationBookEntry: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

type ScopeMock = {
  canAccessStudent: jest.Mock;
  canManageStudentClass: jest.Mock;
  canManageClass: jest.Mock;
};

const MS_PER_DAY = 86_400_000;

// 「今天」要跟 service 用同一把尺 —— 台灣的今天（見 events/day-key 的 todayKey）。
// 用 UTC 午夜算的話，測試在台灣時區的機器上跑，下午之後就會把「明天」誤判成今天。
function todayIso(offsetDays = 0): string {
  return new Date(todayKey().getTime() - offsetDays * MS_PER_DAY).toISOString();
}

function makeTx(): TxMock {
  return {
    communicationBookEntry: {
      findMany: jest.fn(async () => []),
      upsert: jest.fn(async () => ({ id: 'cb-1', studentId: 'stu-1' })),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    attendance: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: 'att-1', studentId: 'stu-1', status: 'PRESENT', source: 'MANUAL' })),
      update: jest.fn(async () => ({ id: 'att-1', studentId: 'stu-1', status: 'PRESENT', source: 'MANUAL' })),
    },
    outboxEvent: { create: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock): PrismaMock {
  return {
    communicationBookEntry: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeScope(): ScopeMock {
  return {
    canAccessStudent: jest.fn(async () => true),
    canManageStudentClass: jest.fn(async () => true),
    canManageClass: jest.fn(async () => true),
  };
}

function makeService(prisma: PrismaMock, scope: ScopeMock, attendance = makeAttendance()): CommunicationBookService {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return new CommunicationBookService(
    prisma as any,
    scope as any,
    new AuditService(prisma as any),
    attendance as any,
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function makeAttendance(): { markWithin: jest.Mock } {
  return { markWithin: jest.fn(async () => ({ id: 'att-1' })) };
}

const role = (r: AuthUser['roles'][number]['role'], scopeId: string | null = null) => ({
  role: r,
  scopeType: (scopeId ? 'CLASS' : 'SCHOOL') as 'CLASS' | 'SCHOOL',
  scopeId,
});

const teacher: BookActor = { id: 'u-teacher', roles: [role('TEACHER', 'class-sun')] };
const parent: BookActor = { id: 'u-parent', roles: [role('PARENT')] };

describe('CommunicationBookService.listByStudent', () => {
  it('家長只查得到已送出的紀錄（publishedAt 非 null）', async () => {
    const prisma = makePrisma(makeTx());
    const scope = makeScope();
    scope.canManageStudentClass.mockResolvedValue(false); // 家長不是班級管理者
    const service = makeService(prisma, scope);

    await service.listByStudent(parent, 'stu-1', { from: todayIso(6), to: todayIso() });

    expect(prisma.communicationBookEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ publishedAt: { not: null } }) }),
    );
  });

  it('老師（自班）查得到尚未送出的紀錄', async () => {
    const prisma = makePrisma(makeTx());
    const service = makeService(prisma, makeScope());

    await service.listByStudent(teacher, 'stu-1', { date: todayIso() });

    const where = prisma.communicationBookEntry.findMany.mock.calls[0][0].where;
    expect(where.publishedAt).toBeUndefined();
  });

  it('非自己小孩 → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    const scope = makeScope();
    scope.canAccessStudent.mockResolvedValue(false);
    const service = makeService(prisma, scope);

    await expect(service.listByStudent(parent, 'stu-other', {})).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('CommunicationBookService.listByClass', () => {
  it('他班 → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    const scope = makeScope();
    scope.canManageClass.mockResolvedValue(false);
    const service = makeService(prisma, scope);

    await expect(service.listByClass(teacher, 'class-other', todayIso())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('CommunicationBookService.save', () => {
  it('upsert 當日紀錄 + 稽核只記欄位名不記內容（不外洩 PII）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const service = makeService(prisma, makeScope());

    await service.save(teacher, {
      studentId: 'stu-1',
      date: todayIso(),
      lunch: 'ALL',
      teacherNote: '今天主動幫忙收玩具',
    });

    expect(tx.communicationBookEntry.upsert).toHaveBeenCalled();
    const auditData = tx.auditLog.create.mock.calls[0][0].data;
    expect(auditData.action).toBe('communication_book.save');
    expect(auditData.metadata.fields).toEqual(['lunch', 'teacherNote']);
    expect(JSON.stringify(auditData.metadata)).not.toContain('收玩具');
  });

  it('未提供的欄位不寫入（局部更新，不會把沒填的洗成 null）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const service = makeService(prisma, makeScope());

    await service.save(teacher, { studentId: 'stu-1', date: todayIso(), mood: 'HAPPY' });

    const update = tx.communicationBookEntry.upsert.mock.calls[0][0].update;
    expect(update.mood).toBe('HAPPY');
    expect(update).not.toHaveProperty('lunch');
  });

  it('明確傳 null → 清空該欄位', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const service = makeService(prisma, makeScope());

    await service.save(teacher, { studentId: 'stu-1', date: todayIso(), temperature: null });

    expect(tx.communicationBookEntry.upsert.mock.calls[0][0].update.temperature).toBeNull();
  });

  it('超過 7 天 → 拒絕（不得事後改寫已交付家長的紀錄）', async () => {
    const prisma = makePrisma(makeTx());
    const service = makeService(prisma, makeScope());

    await expect(
      service.save(teacher, { studentId: 'stu-1', date: todayIso(8), mood: 'HAPPY' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('未來日期 → 拒絕（不能預填明天）', async () => {
    const prisma = makePrisma(makeTx());
    const service = makeService(prisma, makeScope());

    await expect(
      service.save(teacher, { studentId: 'stu-1', date: todayIso(-1), mood: 'HAPPY' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('非自班 → Forbidden 且不進交易', async () => {
    const prisma = makePrisma(makeTx());
    const scope = makeScope();
    scope.canManageStudentClass.mockResolvedValue(false);
    const service = makeService(prisma, scope);

    await expect(
      service.save(teacher, { studentId: 'stu-other', date: todayIso(), mood: 'HAPPY' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('CommunicationBookService.checkIn', () => {
  it('同一交易內寫出缺勤（重用 AttendanceService）+ 到校時間', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const attendance = makeAttendance();
    const service = makeService(prisma, makeScope(), attendance);

    await service.checkIn(teacher, {
      studentId: 'stu-1',
      date: todayIso(),
      arrivalTime: '08:12',
      status: 'PRESENT',
    });

    expect(attendance.markWithin).toHaveBeenCalledWith(
      tx,
      teacher,
      expect.objectContaining({ studentId: 'stu-1', status: 'PRESENT' }),
    );
    expect(tx.communicationBookEntry.upsert.mock.calls[0][0].update.arrivalTime).toBe('08:12');
    expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe('communication_book.check_in');
  });
});

describe('CommunicationBookService.publish', () => {
  it('只送出已填寫且尚未送出的紀錄，並發出 CommunicationBookPublished', async () => {
    const tx = makeTx();
    tx.communicationBookEntry.findMany.mockResolvedValue([
      { id: 'cb-1', studentId: 'stu-1' },
      { id: 'cb-2', studentId: 'stu-2' },
    ]);
    const prisma = makePrisma(tx);
    const service = makeService(prisma, makeScope());

    const result = await service.publish(teacher, {
      classId: 'class-sun',
      date: todayIso(),
      pushStudentIds: ['stu-2'],
    });

    expect(result).toEqual({ published: 2, pushed: 1 });
    const event = tx.outboxEvent.create.mock.calls[0][0].data;
    expect(event.eventType).toBe('CommunicationBookPublished');
    expect(event.payload.studentIds).toEqual(['stu-1', 'stu-2']);
    expect(event.payload.pushStudentIds).toEqual(['stu-2']);
  });

  it('推播名單不信任前端：不在本次送出範圍內的學生一律剔除', async () => {
    const tx = makeTx();
    tx.communicationBookEntry.findMany.mockResolvedValue([{ id: 'cb-1', studentId: 'stu-1' }]);
    const prisma = makePrisma(tx);
    const service = makeService(prisma, makeScope());

    const result = await service.publish(teacher, {
      classId: 'class-sun',
      date: todayIso(),
      pushStudentIds: ['stu-1', 'stu-not-in-class'],
    });

    expect(result.pushed).toBe(1);
    expect(tx.outboxEvent.create.mock.calls[0][0].data.payload.pushStudentIds).toEqual(['stu-1']);
  });

  it('全班都沒填 → 不發事件（不產生空白聯絡簿通知）', async () => {
    const tx = makeTx();
    tx.communicationBookEntry.findMany.mockResolvedValue([]);
    const prisma = makePrisma(tx);
    const service = makeService(prisma, makeScope());

    const result = await service.publish(teacher, { classId: 'class-sun', date: todayIso(), pushStudentIds: [] });

    expect(result).toEqual({ published: 0, pushed: 0 });
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
  });

  it('他班 → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    const scope = makeScope();
    scope.canManageClass.mockResolvedValue(false);
    const service = makeService(prisma, scope);

    await expect(
      service.publish(teacher, { classId: 'class-other', date: todayIso(), pushStudentIds: [] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
