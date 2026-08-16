import { ClassesService } from './classes.service';
import type { AuthUser } from '@sproutin/shared';

// mocked Prisma；驗證班級清單的角色/scope 過濾（OWNER 全校 / TEACHER 自班 / 其餘空）。

type PrismaMock = {
  class: { findMany: jest.Mock };
  teacherAssignment: { findMany: jest.Mock };
};

function roles(...rs: AuthUser['roles'][number]['role'][]): AuthUser['roles'] {
  return rs.map((role) => ({ role, scopeType: 'SCHOOL' as const, scopeId: null }));
}

function makeService(prisma: PrismaMock): ClassesService {
  return new ClassesService(prisma as never);
}

describe('ClassesService.listForUser', () => {
  it('OWNER → 回全校班級', async () => {
    const prisma: PrismaMock = {
      class: { findMany: jest.fn(async () => [{ id: 'c1', name: '小班' }]) },
      teacherAssignment: { findMany: jest.fn() },
    };
    const result = await makeService(prisma).listForUser('u-owner', roles('OWNER'));
    expect(result).toEqual([{ id: 'c1', name: '小班' }]);
    expect(prisma.class.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.teacherAssignment.findMany).not.toHaveBeenCalled();
  });

  it('TEACHER → 只回自己任教班級（去重、依名稱排序）', async () => {
    const prisma: PrismaMock = {
      class: { findMany: jest.fn() },
      teacherAssignment: {
        findMany: jest.fn(async () => [
          { class: { id: 'c2', name: '中班' } },
          { class: { id: 'c1', name: '小班' } },
          { class: { id: 'c1', name: '小班' } }, // 重複 → 去重
        ]),
      },
    };
    const result = await makeService(prisma).listForUser('u-teacher', roles('TEACHER'));
    expect(result).toEqual([
      { id: 'c1', name: '小班' },
      { id: 'c2', name: '中班' },
    ]);
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
