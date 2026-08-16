import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeavesService, LeaveActor, LeaveView } from './leaves.service';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// 驗證 Leave 狀態機 + config 分支 + 同交易寫 Leave/Outbox/Audit + 授權矩陣。mocked Prisma，不需 DB。

type TxMock = {
  leave: { create: jest.Mock; update: jest.Mock };
  outboxEvent: { create: jest.Mock };
  auditLog: { create: jest.Mock };
};

type PrismaMock = {
  schoolConfig: { findFirst: jest.Mock };
  leave: { findUnique: jest.Mock; findMany: jest.Mock };
  $transaction: jest.Mock;
};

type ScopeMock = {
  canAccessStudent: jest.Mock;
  canManageStudentClass: jest.Mock;
  canManageClass: jest.Mock;
};

const D1 = new Date('2026-08-20T00:00:00.000Z');
const D2 = new Date('2026-08-21T00:00:00.000Z');

function leaveRow(overrides: Partial<LeaveView> = {}): LeaveView {
  return {
    id: 'leave-1',
    studentId: 'stu-sun-1',
    dateFrom: D1,
    dateTo: D2,
    reason: '感冒',
    status: 'PENDING',
    reviewedBy: null,
    reviewNote: null,
    createdBy: 'u-parent',
    createdAt: new Date('2026-08-15T00:00:00.000Z'),
    ...overrides,
  };
}

function makeTx(): TxMock {
  return {
    leave: {
      create: jest.fn(async ({ data }) => leaveRow({ status: data.status, createdBy: data.createdBy })),
      update: jest.fn(async ({ data }) => leaveRow({ status: data.status, reviewedBy: data.reviewedBy ?? null })),
    },
    outboxEvent: { create: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock): PrismaMock {
  return {
    schoolConfig: { findFirst: jest.fn(async () => ({ leaveRequiresApproval: true })) },
    leave: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
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

function makeService(prisma: PrismaMock, scope: ScopeMock): LeavesService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new LeavesService(prisma as any, scope as any, new AuditService(prisma as any));
}

const role = (r: AuthUser['roles'][number]['role'], scopeId: string | null = null) => ({
  role: r,
  scopeType: (scopeId ? 'CLASS' : 'SCHOOL') as 'CLASS' | 'SCHOOL',
  scopeId,
});

const parent: LeaveActor = { id: 'u-parent', roles: [role('PARENT')] };
const teacher: LeaveActor = { id: 'u-teacher', roles: [role('TEACHER', 'class-sun')] };

const CREATE_INPUT = {
  studentId: 'stu-sun-1',
  dateFrom: D1.toISOString(),
  dateTo: D2.toISOString(),
  reason: '感冒',
};

describe('LeavesService.create', () => {
  it('leaveRequiresApproval=true → PENDING;同交易寫 Leave + LeaveSubmitted + audit(leave.submit)', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.schoolConfig.findFirst.mockResolvedValue({ leaveRequiresApproval: true });
    const scope = makeScope();
    const service = makeService(prisma, scope);

    const result = await service.create(parent, CREATE_INPUT);

    expect(result.status).toBe('PENDING');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.leave.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', createdBy: 'u-parent' }) }),
    );
    // 僅 LeaveSubmitted（尚未核准）
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'LeaveSubmitted' }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'leave.submit', result: 'SUCCESS' }) }),
    );
  });

  it('leaveRequiresApproval=false → APPROVED;同交易再發 LeaveApproved（共 2 事件）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.schoolConfig.findFirst.mockResolvedValue({ leaveRequiresApproval: false });
    const service = makeService(prisma, makeScope());

    const result = await service.create(parent, CREATE_INPUT);

    expect(result.status).toBe('APPROVED');
    expect(tx.leave.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(2);
    const events = tx.outboxEvent.create.mock.calls.map((c) => c[0].data.eventType);
    expect(events).toEqual(['LeaveSubmitted', 'LeaveApproved']);
  });

  it('查無 SchoolConfig → 保守預設需審核（PENDING）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.schoolConfig.findFirst.mockResolvedValue(null);
    const service = makeService(prisma, makeScope());

    const result = await service.create(parent, CREATE_INPUT);
    expect(result.status).toBe('PENDING');
  });

  it('非自己小孩（scope deny）→ Forbidden;不進交易', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const scope = makeScope();
    scope.canAccessStudent.mockResolvedValue(false);
    const service = makeService(prisma, scope);

    await expect(service.create(parent, CREATE_INPUT)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('LeavesService.setStatus', () => {
  it('PENDING → APPROVED：更新 + LeaveApproved + audit(leave.approve);reviewedBy 記審核者', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.leave.findUnique.mockResolvedValue({ id: 'leave-1', studentId: 'stu-sun-1', status: 'PENDING' });
    const service = makeService(prisma, makeScope());

    await service.setStatus(teacher, 'leave-1', 'APPROVED', 'ok');

    expect(tx.leave.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', reviewedBy: 'u-teacher' }) }),
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'LeaveApproved' }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'leave.approve' }) }),
    );
  });

  it('PENDING → REJECTED：發 LeaveRejected + audit(leave.reject)', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.leave.findUnique.mockResolvedValue({ id: 'leave-1', studentId: 'stu-sun-1', status: 'PENDING' });
    const service = makeService(prisma, makeScope());

    await service.setStatus(teacher, 'leave-1', 'REJECTED');

    const events = tx.outboxEvent.create.mock.calls.map((c) => c[0].data.eventType);
    expect(events).toEqual(['LeaveRejected']);
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'leave.reject' }) }),
    );
  });

  it('leave 不存在 → NotFound', async () => {
    const prisma = makePrisma(makeTx());
    prisma.leave.findUnique.mockResolvedValue(null);
    const service = makeService(prisma, makeScope());
    await expect(service.setStatus(teacher, 'missing', 'APPROVED')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('非班級管理者 → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    prisma.leave.findUnique.mockResolvedValue({ id: 'leave-1', studentId: 'stu-tul-1', status: 'PENDING' });
    const scope = makeScope();
    scope.canManageStudentClass.mockResolvedValue(false);
    const service = makeService(prisma, scope);
    await expect(service.setStatus(teacher, 'leave-1', 'APPROVED')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('已 APPROVED 再審核 → 409 LEAVE_INVALID_TRANSITION;不進交易', async () => {
    const prisma = makePrisma(makeTx());
    prisma.leave.findUnique.mockResolvedValue({ id: 'leave-1', studentId: 'stu-sun-1', status: 'APPROVED' });
    const service = makeService(prisma, makeScope());
    await expect(service.setStatus(teacher, 'leave-1', 'APPROVED')).rejects.toThrow('LEAVE_INVALID_TRANSITION');
    await expect(service.setStatus(teacher, 'leave-1', 'APPROVED')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('LeavesService.cancel', () => {
  it('申請者本人取消 PENDING → CANCELLED + LeaveCancelled;不查管理者權限', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.leave.findUnique.mockResolvedValue({
      id: 'leave-1',
      studentId: 'stu-sun-1',
      status: 'PENDING',
      createdBy: 'u-parent',
    });
    const scope = makeScope();
    const service = makeService(prisma, scope);

    await service.cancel(parent, 'leave-1');

    expect(scope.canManageStudentClass).not.toHaveBeenCalled(); // 申請者本人即可
    expect(tx.leave.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }),
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'LeaveCancelled' }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'leave.cancel' }) }),
    );
  });

  it('班級管理者取消他人申請的 APPROVED → CANCELLED', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.leave.findUnique.mockResolvedValue({
      id: 'leave-1',
      studentId: 'stu-sun-1',
      status: 'APPROVED',
      createdBy: 'u-parent',
    });
    const service = makeService(prisma, makeScope());

    await service.cancel(teacher, 'leave-1');
    expect(tx.leave.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }),
    );
  });

  it('非申請者且非管理者 → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    prisma.leave.findUnique.mockResolvedValue({
      id: 'leave-1',
      studentId: 'stu-tul-1',
      status: 'PENDING',
      createdBy: 'someone-else',
    });
    const scope = makeScope();
    scope.canManageStudentClass.mockResolvedValue(false);
    const service = makeService(prisma, scope);
    await expect(service.cancel(teacher, 'leave-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('已 REJECTED 取消 → 409 LEAVE_INVALID_TRANSITION', async () => {
    const prisma = makePrisma(makeTx());
    prisma.leave.findUnique.mockResolvedValue({
      id: 'leave-1',
      studentId: 'stu-sun-1',
      status: 'REJECTED',
      createdBy: 'u-parent',
    });
    const service = makeService(prisma, makeScope());
    await expect(service.cancel(parent, 'leave-1')).rejects.toThrow('LEAVE_INVALID_TRANSITION');
  });
});

describe('LeavesService.listForStudent', () => {
  it('scope allow → findMany（依 studentId、createdAt desc）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.leave.findMany.mockResolvedValue([leaveRow()]);
    const service = makeService(prisma, makeScope());

    const list = await service.listForStudent(parent, 'stu-sun-1');
    expect(list).toHaveLength(1);
    expect(prisma.leave.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: 'stu-sun-1' }, orderBy: { createdAt: 'desc' } }),
    );
  });

  it('scope deny → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    const scope = makeScope();
    scope.canAccessStudent.mockResolvedValue(false);
    const service = makeService(prisma, scope);
    await expect(service.listForStudent(parent, 'stu-other')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('LeavesService.listForClass', () => {
  it('班級管理者 + status → 依 student.classId + status 查詢（createdAt desc）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.leave.findMany.mockResolvedValue([leaveRow()]);
    const service = makeService(prisma, makeScope());

    const list = await service.listForClass(teacher, 'class-sun', 'PENDING');
    expect(list).toHaveLength(1);
    expect(prisma.leave.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { student: { classId: 'class-sun' }, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('未帶 status → 不加 status 過濾', async () => {
    const prisma = makePrisma(makeTx());
    prisma.leave.findMany.mockResolvedValue([]);
    const service = makeService(prisma, makeScope());

    await service.listForClass(teacher, 'class-sun');
    expect(prisma.leave.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { student: { classId: 'class-sun' } } }),
    );
  });

  it('非班級管理者 → Forbidden;不查詢', async () => {
    const prisma = makePrisma(makeTx());
    const scope = makeScope();
    scope.canManageClass.mockResolvedValue(false);
    const service = makeService(prisma, scope);
    await expect(service.listForClass(teacher, 'class-tulip')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.leave.findMany).not.toHaveBeenCalled();
  });
});
