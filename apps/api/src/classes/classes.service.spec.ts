import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClassesService, ClassActor } from './classes.service';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// mocked Prisma；驗證班級清單的角色/scope 過濾（OWNER 全校 / TEACHER 自班 / 其餘空）
// 與管理操作（建立/改名/刪除）的規則 + 稽核。

type PrismaMock = {
  class: { findMany: jest.Mock; findFirst?: jest.Mock; findUnique?: jest.Mock };
  teacherAssignment: { findMany: jest.Mock; findFirst?: jest.Mock };
  school?: { findFirst: jest.Mock };
  $transaction?: jest.Mock;
};

function roles(...rs: AuthUser['roles'][number]['role'][]): AuthUser['roles'] {
  return rs.map((role) => ({ role, scopeType: 'SCHOOL' as const, scopeId: null }));
}

function makeService(prisma: PrismaMock): ClassesService {
  return new ClassesService(prisma as never, new AuditService(prisma as never));
}

const cls = (id: string, name: string, students = 0) => ({
  id,
  name,
  _count: { students },
});

const owner: ClassActor = { id: 'u-owner', roles: roles('OWNER') };

describe('ClassesService.listForUser', () => {
  it('OWNER → 回全校班級（含學生人數）', async () => {
    const prisma: PrismaMock = {
      class: { findMany: jest.fn(async () => [cls('c1', '小班', 3)]) },
      teacherAssignment: { findMany: jest.fn() },
    };
    const result = await makeService(prisma).listForUser('u-owner', roles('OWNER'));
    expect(result).toEqual([{ id: 'c1', name: '小班', studentCount: 3 }]);
    expect(prisma.class.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.teacherAssignment.findMany).not.toHaveBeenCalled();
  });

  it('TEACHER → 只回自己任教班級（去重）', async () => {
    const prisma: PrismaMock = {
      class: { findMany: jest.fn() },
      teacherAssignment: {
        findMany: jest.fn(async () => [
          { class: cls('c2', '中班') },
          { class: cls('c1', '小班') },
          { class: cls('c1', '小班') }, // 重複 → 去重
        ]),
      },
    };
    const result = await makeService(prisma).listForUser('u-teacher', roles('TEACHER'));
    // 去重後兩班（排序依 localeCompare，跨平台 locale 不同 → 不斷言順序，改以集合驗證）。
    expect(result).toHaveLength(2);
    expect([...result].map((c) => c.id).sort()).toEqual(['c1', 'c2']);
    expect(result.find((c) => c.id === 'c1')?.name).toBe('小班');
    expect(prisma.class.findMany).not.toHaveBeenCalled();
  });

  it('PARENT → 回空陣列（不查 DB）', async () => {
    const prisma: PrismaMock = {
      class: { findMany: jest.fn() },
      teacherAssignment: { findMany: jest.fn() },
    };
    const result = await makeService(prisma).listForUser('u-parent', roles('PARENT'));
    expect(result).toEqual([]);
    expect(prisma.class.findMany).not.toHaveBeenCalled();
    expect(prisma.teacherAssignment.findMany).not.toHaveBeenCalled();
  });
});

describe('ClassesService 管理操作', () => {
  type TxMock = {
    class: { create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    auditLog: { create: jest.Mock };
  };

  function makeWritablePrisma(existing: ReturnType<typeof cls> | null, duplicate = false) {
    const tx: TxMock = {
      class: {
        create: jest.fn(async ({ data }) => cls('c-new', data.name)),
        update: jest.fn(async ({ data }) => cls('c1', data.name)),
        delete: jest.fn(async () => ({})),
      },
      auditLog: { create: jest.fn(async () => ({})) },
    };
    const prisma: PrismaMock & { tx: TxMock } = {
      tx,
      class: {
        findMany: jest.fn(),
        findFirst: jest.fn(async () => (duplicate ? { id: 'other' } : null)),
        findUnique: jest.fn(async () => existing),
      },
      teacherAssignment: { findMany: jest.fn(), findFirst: jest.fn(async () => null) },
      school: { findFirst: jest.fn(async () => ({ id: 'school-1' })) },
      $transaction: jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
    };
    return prisma;
  }

  it('建立班級 → 寫入 + 同交易稽核', async () => {
    const prisma = makeWritablePrisma(null);
    const created = await makeService(prisma).create(owner, '向日葵班');

    expect(created).toEqual({ id: 'c-new', name: '向日葵班', studentCount: 0 });
    const entry = prisma.tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('class.create');
    expect(entry.actorUserId).toBe('u-owner');
  });

  it('班名重複 → 409，不寫入', async () => {
    const prisma = makeWritablePrisma(null, true);
    await expect(makeService(prisma).create(owner, '向日葵班')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.tx.class.create).not.toHaveBeenCalled();
  });

  it('改名不存在的班級 → 404', async () => {
    const prisma = makeWritablePrisma(null);
    await expect(makeService(prisma).rename(owner, 'nope', '新名')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('班內還有學生 → 拒絕刪除（409），避免歷史資料成孤兒', async () => {
    const prisma = makeWritablePrisma(cls('c1', '小班', 2));
    await expect(makeService(prisma).remove(owner, 'c1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.tx.class.delete).not.toHaveBeenCalled();
  });

  it('班內還有老師編制 → 拒絕刪除（409）', async () => {
    const prisma = makeWritablePrisma(cls('c1', '小班', 0));
    prisma.teacherAssignment.findFirst = jest.fn(async () => ({ id: 'ta-1' }));
    await expect(makeService(prisma).remove(owner, 'c1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.tx.class.delete).not.toHaveBeenCalled();
  });

  it('空班 → 可刪除，並記稽核', async () => {
    const prisma = makeWritablePrisma(cls('c1', '小班', 0));
    await makeService(prisma).remove(owner, 'c1');
    expect(prisma.tx.class.delete).toHaveBeenCalledTimes(1);
    expect(prisma.tx.auditLog.create.mock.calls[0][0].data.action).toBe('class.delete');
  });
});
