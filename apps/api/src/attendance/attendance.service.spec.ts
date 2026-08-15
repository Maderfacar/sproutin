import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttendanceService, AttendanceActor, AttendanceView } from './attendance.service';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// 驗證手動標記（SoT）+ ADR-002 override（Derived→MANUAL 保留血緣）+ 同交易寫 Attendance/Outbox/Audit + 授權。

type TxMock = {
  attendance: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  outboxEvent: { create: jest.Mock };
  auditLog: { create: jest.Mock };
};
type PrismaMock = {
  attendance: { findUnique: jest.Mock; findMany: jest.Mock };
  teacherAssignment: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};
type ScopeMock = { canAccessStudent: jest.Mock; canManageStudentClass: jest.Mock };

const DATE = new Date('2026-08-20T00:00:00.000Z');

function attRow(overrides: Partial<AttendanceView> = {}): AttendanceView {
  return {
    id: 'att-1',
    studentId: 'stu-sun-1',
    date: DATE,
    status: 'PRESENT',
    source: 'MANUAL',
    sourceRef: null,
    derivedFrom: null,
    overriddenAt: null,
    overriddenBy: null,
    ...overrides,
  };
}

function makeTx(): TxMock {
  return {
    attendance: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }) => attRow({ status: data.status, source: data.source })),
      update: jest.fn(async ({ data }) => attRow({ status: data.status, source: data.source ?? 'MANUAL', overriddenBy: data.overriddenBy ?? null })),
    },
    outboxEvent: { create: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock): PrismaMock {
  return {
    attendance: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    teacherAssignment: { findFirst: jest.fn(async () => null) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeScope(): ScopeMock {
  return { canAccessStudent: jest.fn(async () => true), canManageStudentClass: jest.fn(async () => true) };
}

function makeService(prisma: PrismaMock, scope: ScopeMock): AttendanceService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new AttendanceService(prisma as any, scope as any, new AuditService(prisma as any));
}

const role = (r: AuthUser['roles'][number]['role'], scopeId: string | null = null) => ({
  role: r,
  scopeType: (scopeId ? 'CLASS' : 'SCHOOL') as 'CLASS' | 'SCHOOL',
  scopeId,
});

const teacher: AttendanceActor = { id: 'u-teacher', roles: [role('TEACHER', 'class-sun')] };
const MARK = { studentId: 'stu-sun-1', date: DATE.toISOString(), status: 'PRESENT' as const };

describe('AttendanceService.mark', () => {
  it('當日無列 → 建立 source=MANUAL + AttendanceMarked + audit(attendance.mark)', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    tx.attendance.findUnique.mockResolvedValue(null);
    const service = makeService(prisma, makeScope());

    const row = await service.mark(teacher, MARK);

    expect(row.source).toBe('MANUAL');
    expect(tx.attendance.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: 'MANUAL', status: 'PRESENT' }) }),
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'AttendanceMarked' }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'attendance.mark' }) }),
    );
  });

  it('當日已有 LEAVE_EVENT 列 → override 轉 MANUAL、保留血緣、audit(attendance.override)', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    tx.attendance.findUnique.mockResolvedValue({
      id: 'att-le',
      source: 'LEAVE_EVENT',
      sourceRef: 'leave-9',
      derivedFrom: null,
    });
    const service = makeService(prisma, makeScope());

    await service.mark(teacher, { ...MARK, status: 'ABSENT' });

    expect(tx.attendance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'att-le' },
        data: expect.objectContaining({
          source: 'MANUAL',
          sourceRef: null,
          derivedFrom: 'leave-9', // 血緣保留（原 sourceRef）
          overriddenBy: 'u-teacher',
        }),
      }),
    );
    expect(tx.attendance.update.mock.calls[0][0].data.overriddenAt).toBeInstanceOf(Date);
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'attendance.override' }) }),
    );
  });

  it('非自班（scope deny）→ Forbidden;不進交易', async () => {
    const prisma = makePrisma(makeTx());
    const scope = makeScope();
    scope.canManageStudentClass.mockResolvedValue(false);
    const service = makeService(prisma, scope);
    await expect(service.mark(teacher, MARK)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('AttendanceService.update', () => {
  it('原 MANUAL → 只改狀態（非 override）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.attendance.findUnique.mockResolvedValue({
      id: 'att-1',
      studentId: 'stu-sun-1',
      source: 'MANUAL',
      sourceRef: null,
      derivedFrom: null,
    });
    const service = makeService(prisma, makeScope());

    await service.update(teacher, 'att-1', 'LATE');

    expect(tx.attendance.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'att-1' }, data: { status: 'LATE' } }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'attendance.update' }) }),
    );
  });

  it('原 LEAVE_EVENT → override（轉 MANUAL、記 overriddenBy）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.attendance.findUnique.mockResolvedValue({
      id: 'att-le',
      studentId: 'stu-sun-1',
      source: 'LEAVE_EVENT',
      sourceRef: 'leave-9',
      derivedFrom: null,
    });
    const service = makeService(prisma, makeScope());

    await service.update(teacher, 'att-le', 'PRESENT');

    const data = tx.attendance.update.mock.calls[0][0].data;
    expect(data.source).toBe('MANUAL');
    expect(data.derivedFrom).toBe('leave-9');
    expect(data.overriddenBy).toBe('u-teacher');
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'attendance.override' }) }),
    );
  });

  it('列不存在 → NotFound', async () => {
    const prisma = makePrisma(makeTx());
    prisma.attendance.findUnique.mockResolvedValue(null);
    const service = makeService(prisma, makeScope());
    await expect(service.update(teacher, 'missing', 'PRESENT')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('非自班 → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    prisma.attendance.findUnique.mockResolvedValue({
      id: 'att-1',
      studentId: 'stu-tul-1',
      source: 'MANUAL',
      sourceRef: null,
      derivedFrom: null,
    });
    const scope = makeScope();
    scope.canManageStudentClass.mockResolvedValue(false);
    const service = makeService(prisma, scope);
    await expect(service.update(teacher, 'att-1', 'PRESENT')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('AttendanceService.list', () => {
  it('?studentId= → scope canAccessStudent + findMany', async () => {
    const prisma = makePrisma(makeTx());
    prisma.attendance.findMany.mockResolvedValue([attRow()]);
    const scope = makeScope();
    const service = makeService(prisma, scope);

    const rows = await service.list(teacher, { studentId: 'stu-sun-1' });
    expect(rows).toHaveLength(1);
    expect(scope.canAccessStudent).toHaveBeenCalled();
  });

  it('?classId= 老師自班 → findMany（student.classId 過濾）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
    prisma.attendance.findMany.mockResolvedValue([attRow()]);
    const service = makeService(prisma, makeScope());

    await service.list(teacher, { classId: 'class-sun', date: DATE.toISOString() });
    expect(prisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ student: { classId: 'class-sun' } }) }),
    );
  });

  it('?classId= 他班 → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    prisma.teacherAssignment.findFirst.mockResolvedValue(null);
    const service = makeService(prisma, makeScope());
    await expect(service.list(teacher, { classId: 'class-other' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
