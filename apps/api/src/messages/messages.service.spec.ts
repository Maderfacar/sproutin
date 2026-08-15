import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagesService, MessageActor } from './messages.service';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// 訊息：雙向發訊（scope）+ 同交易 Message/Outbox/Audit + 已讀。mocked Prisma。

type TxMock = {
  message: { create: jest.Mock };
  outboxEvent: { create: jest.Mock };
  auditLog: { create: jest.Mock };
};
type PrismaMock = {
  student: { findUnique: jest.Mock };
  message: { findUnique: jest.Mock; findMany: jest.Mock };
  messageRead: { findMany: jest.Mock; upsert: jest.Mock };
  $transaction: jest.Mock;
};
type ScopeMock = { canAccessStudent: jest.Mock; canManageStudentClass: jest.Mock };

function makeTx(): TxMock {
  return {
    message: {
      create: jest.fn(async ({ data }) => ({
        id: 'msg-1',
        studentId: data.studentId,
        classId: data.classId,
        senderId: data.senderId,
        category: data.category,
        body: data.body,
        createdAt: new Date('2026-08-15T00:00:00.000Z'),
      })),
    },
    outboxEvent: { create: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock): PrismaMock {
  return {
    student: { findUnique: jest.fn(async () => ({ classId: 'class-sun' })) },
    message: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    messageRead: { findMany: jest.fn(async () => []), upsert: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeScope(): ScopeMock {
  return { canAccessStudent: jest.fn(async () => true), canManageStudentClass: jest.fn(async () => true) };
}

function makeService(prisma: PrismaMock, scope: ScopeMock): MessagesService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new MessagesService(prisma as any, scope as any, new AuditService(prisma as any));
}

const role = (r: AuthUser['roles'][number]['role']) => ({ role: r, scopeType: 'SCHOOL' as const, scopeId: null });
const parent: MessageActor = { id: 'u-parent', roles: [role('PARENT')] };

describe('MessagesService.send', () => {
  it('scope allow → 建 Message + MessageSent + audit(message.send);classId 由 student 推導', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const service = makeService(prisma, makeScope());

    const msg = await service.send(parent, { studentId: 'stu-sun-1', body: '哈囉' });

    expect(msg.classId).toBe('class-sun');
    expect(msg.isRead).toBe(true); // 發訊者本人視為已讀
    expect(tx.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-parent', category: 'GENERAL' }),
      }),
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'MessageSent' }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'message.send' }) }),
    );
  });

  it('scope deny → Forbidden;不進交易', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const scope = makeScope();
    scope.canAccessStudent.mockResolvedValue(false);
    const service = makeService(prisma, scope);
    await expect(service.send(parent, { studentId: 'stu-x', body: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('student 不存在 → NotFound', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.student.findUnique.mockResolvedValue(null);
    const service = makeService(prisma, makeScope());
    await expect(service.send(parent, { studentId: 'missing', body: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('MessagesService.listForStudent', () => {
  it('scope allow → 回訊息 + isRead（依 MessageRead / 自己發的）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.message.findMany.mockResolvedValue([
      { id: 'm1', studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-teacher', category: 'GENERAL', body: 'a', createdAt: new Date() },
      { id: 'm2', studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-parent', category: 'GENERAL', body: 'b', createdAt: new Date() },
    ]);
    prisma.messageRead.findMany.mockResolvedValue([{ messageId: 'm1' }]);
    const service = makeService(prisma, makeScope());

    const list = await service.listForStudent(parent, 'stu-sun-1');
    expect(list.find((m) => m.id === 'm1')!.isRead).toBe(true); // 有 MessageRead
    expect(list.find((m) => m.id === 'm2')!.isRead).toBe(true); // 自己發的
  });

  it('scope deny → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    const scope = makeScope();
    scope.canAccessStudent.mockResolvedValue(false);
    await expect(makeService(prisma, scope).listForStudent(parent, 'stu-x')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('MessagesService.markRead', () => {
  it('scope allow → upsert MessageRead', async () => {
    const prisma = makePrisma(makeTx());
    prisma.message.findUnique.mockResolvedValue({ id: 'm1', studentId: 'stu-sun-1' });
    const service = makeService(prisma, makeScope());
    await service.markRead(parent, 'm1');
    expect(prisma.messageRead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { messageId_userId: { messageId: 'm1', userId: 'u-parent' } } }),
    );
  });

  it('訊息不存在 → NotFound', async () => {
    const prisma = makePrisma(makeTx());
    prisma.message.findUnique.mockResolvedValue(null);
    await expect(makeService(prisma, makeScope()).markRead(parent, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
