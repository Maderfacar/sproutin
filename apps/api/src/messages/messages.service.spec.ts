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
  user: { findMany: jest.Mock };
  guardianship: { findMany: jest.Mock; findFirst: jest.Mock };
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
    // 發話者標示（姓名 + 對這個學生的身分）。u-parent 是媽媽、u-teacher 是老師。
    user: {
      findMany: jest.fn(async () => [
        { id: 'u-parent', displayName: '陳美玲', roles: [{ role: 'PARENT' }] },
        { id: 'u-teacher', displayName: '林曉萱', roles: [{ role: 'TEACHER' }] },
      ]),
    },
    guardianship: {
      findMany: jest.fn(async () => [{ userId: 'u-parent', relation: 'MOTHER' }]),
      // 發話時對照「宣稱的身分」用的那一查（見 resolveSenderAs）。
      findFirst: jest.fn(async () => null),
    },
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

  // 沒有這一段，對話串上三個人講的話長得一模一樣。
  it('每則帶發話者：家長給對這個學生的關係，校方給身分', async () => {
    const prisma = makePrisma(makeTx());
    prisma.message.findMany.mockResolvedValue([
      { id: 'm1', studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-teacher', category: 'GENERAL', body: 'a', createdAt: new Date() },
      { id: 'm2', studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-parent', category: 'GENERAL', body: 'b', createdAt: new Date() },
    ]);
    const service = makeService(prisma, makeScope());

    const list = await service.listForStudent(parent, 'stu-sun-1');
    const fromTeacher = list.find((m) => m.id === 'm1')!;
    const fromParent = list.find((m) => m.id === 'm2')!;

    expect(fromTeacher).toMatchObject({
      senderName: '林曉萱',
      senderRole: 'TEACHER',
      senderRelation: null,
    });
    expect(fromParent).toMatchObject({
      senderName: '陳美玲',
      senderRelation: 'MOTHER',
      senderRole: null, // 是這個孩子的家人時，顯示的是家人身分
    });
  });

  // 這一欄上線前的舊訊息（senderAs 為 null）沿用原本的推導規則。
  it('舊訊息沒有記下身分 → 同時是校方又是這個孩子的家長時顯示家長身分', async () => {
    const prisma = makePrisma(makeTx());
    prisma.message.findMany.mockResolvedValue([
      { id: 'm1', studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-both', category: 'GENERAL', body: 'a', createdAt: new Date() },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u-both', displayName: '林曉萱', roles: [{ role: 'TEACHER' }, { role: 'PARENT' }] },
    ]);
    prisma.guardianship.findMany.mockResolvedValue([{ userId: 'u-both', relation: 'MOTHER' }]);

    const list = await makeService(prisma, makeScope()).listForStudent(parent, 'stu-sun-1');
    expect(list[0]).toMatchObject({ senderRelation: 'MOTHER', senderRole: null });
  });

  // 帳號一律停用不刪除，所以理論上不會發生；真的發生時要明講，不能顯示空白。
  it('查不到發話者 → 明白標示，不留空白', async () => {
    const prisma = makePrisma(makeTx());
    prisma.message.findMany.mockResolvedValue([
      { id: 'm1', studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-ghost', category: 'GENERAL', body: 'a', createdAt: new Date() },
    ]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.guardianship.findMany.mockResolvedValue([]);

    const list = await makeService(prisma, makeScope()).listForStudent(parent, 'stu-sun-1');
    expect(list[0]!.senderName).toBe('未知的發話者');
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

// 發話當下戴的是哪頂帽子（Human Owner 2026-08-20 回報：同時是班導與某位學生的家長時，
// 兩種身分講的話長得一模一樣）。**身分是逐筆記下來的，不是整串推導出來的。**
describe('MessagesService 的發話身分（senderAs）', () => {
  const both = {
    id: 'u-both',
    roles: [
      { role: 'TEACHER' as const, scopeType: 'SCHOOL' as const, scopeId: null },
      { role: 'PARENT' as const, scopeType: 'SCHOOL' as const, scopeId: null },
    ],
  };

  function dualPrisma() {
    const prisma = makePrisma(makeTx());
    prisma.user.findMany.mockResolvedValue([
      { id: 'u-both', displayName: '林曉萱', roles: [{ role: 'TEACHER' }, { role: 'PARENT' }] },
    ]);
    prisma.guardianship.findMany.mockResolvedValue([{ userId: 'u-both', relation: 'MOTHER' }]);
    prisma.guardianship.findFirst.mockResolvedValue({ id: 'g1' });
    return prisma;
  }

  it('身分真的寫進那一筆訊息，不是只在畫面上算出來的', async () => {
    const tx = makeTx();
    const prisma = dualPrisma();
    prisma.$transaction = jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx));

    await makeService(prisma, makeScope()).send(both, {
      studentId: 'stu-sun-1',
      body: '下週三請假',
      senderAs: 'GUARDIAN',
    });

    expect(tx.message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ senderAs: 'GUARDIAN' }) }),
    );
  });

  it('以老師身分送出 → 顯示的是老師，不是母親', async () => {
    const prisma = dualPrisma();
    const view = await makeService(prisma, makeScope()).send(both, {
      studentId: 'stu-sun-1',
      body: '我會多留意',
      senderAs: 'STAFF',
    });
    expect(view).toMatchObject({ senderRole: 'TEACHER', senderRelation: null });
  });

  it('以家長身分送出 → 顯示的是母親', async () => {
    const prisma = dualPrisma();
    const view = await makeService(prisma, makeScope()).send(both, {
      studentId: 'stu-sun-1',
      body: '下週三請假',
      senderAs: 'GUARDIAN',
    });
    expect(view).toMatchObject({ senderRelation: 'MOTHER', senderRole: null });
  });

  // 不信任前端：宣稱不成立就退回真實的那一個，而不是把訊息擋下來
  //（這是顯示用的標籤，不是權限）。
  it('宣稱家長但不是這個孩子的監護人 → 退回校方身分', async () => {
    const prisma = dualPrisma();
    prisma.guardianship.findFirst.mockResolvedValue(null);
    prisma.guardianship.findMany.mockResolvedValue([]);
    const view = await makeService(prisma, makeScope()).send(both, {
      studentId: 'stu-sun-1',
      body: '假冒',
      senderAs: 'GUARDIAN',
    });
    expect(view).toMatchObject({ senderRole: 'TEACHER', senderRelation: null });
  });

  it('宣稱校方但沒有任何校方角色 → 退回家長身分', async () => {
    const prisma = dualPrisma();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u-parent-only', displayName: '陳美玲', roles: [{ role: 'PARENT' }] },
    ]);
    prisma.guardianship.findMany.mockResolvedValue([{ userId: 'u-parent-only', relation: 'MOTHER' }]);
    const view = await makeService(prisma, makeScope()).send(
      { id: 'u-parent-only', roles: [{ role: 'PARENT', scopeType: 'SCHOOL', scopeId: null }] },
      { studentId: 'stu-sun-1', body: '假冒老師', senderAs: 'STAFF' },
    );
    expect(view).toMatchObject({ senderRelation: 'MOTHER', senderRole: null });
  });

  // 同一個人在同一串裡兩種身分都講過 —— 這正是要修的那件事。
  it('同一串裡同一個人的兩種身分各自顯示', async () => {
    const prisma = dualPrisma();
    prisma.message.findMany.mockResolvedValue([
      { id: 'm1', studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-both', senderAs: 'STAFF', category: 'GENERAL', body: '我會多留意', createdAt: new Date() },
      { id: 'm2', studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-both', senderAs: 'GUARDIAN', category: 'GENERAL', body: '下週三請假', createdAt: new Date() },
    ]);
    const list = await makeService(prisma, makeScope()).listForStudent(both, 'stu-sun-1');
    expect(list[0]).toMatchObject({ senderRole: 'TEACHER', senderRelation: null });
    expect(list[1]).toMatchObject({ senderRelation: 'MOTHER', senderRole: null });
  });
});
