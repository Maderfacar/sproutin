import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService, UserActor } from './users.service';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// 人員帳號：建立（含角色）、停用規則（不刪除、最後一位園長不可停用）、稽核不存姓名。

type TxMock = {
  user: { create: jest.Mock; update: jest.Mock };
  userRole: { create: jest.Mock; deleteMany: jest.Mock };
  teacherAssignment: { deleteMany: jest.Mock };
  guardianship: { deleteMany: jest.Mock };
  auditLog: { create: jest.Mock };
};
type PrismaMock = {
  tx: TxMock;
  user: { findMany: jest.Mock; findUnique: jest.Mock; count: jest.Mock };
  userRole: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};

const userRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'u-1',
  displayName: '林老師',
  status: 'ACTIVE',
  roles: [{ role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null }],
  lineIdentity: null,
  guardianOf: [],
  teaching: [{ id: 'ta-1', classId: 'c1', class: { name: '向日葵班' } }],
  ...over,
});

function makePrisma(): PrismaMock {
  const tx: TxMock = {
    user: {
      create: jest.fn(async ({ data }) => ({ id: 'u-new', displayName: data.displayName })),
      update: jest.fn(async () => ({})),
    },
    userRole: { create: jest.fn(async () => ({})), deleteMany: jest.fn(async () => ({ count: 1 })) },
    teacherAssignment: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    guardianship: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  return {
    tx,
    user: {
      findMany: jest.fn(async () => [userRow()]),
      findUnique: jest.fn(async () => userRow()),
      count: jest.fn(async () => 1),
    },
    userRole: { findFirst: jest.fn(async () => null) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeService(prisma: PrismaMock): UsersService {
  return new UsersService(prisma as never, new AuditService(prisma as never));
}

const role = (r: AuthUser['roles'][number]['role']) => ({
  role: r,
  scopeType: 'SCHOOL' as const,
  scopeId: null,
});
const owner: UserActor = { id: 'u-owner', roles: [role('OWNER')] };

describe('UsersService.list / getById', () => {
  it('回傳角色、任教班級、是否已綁 LINE', async () => {
    const list = await makeService(makePrisma()).list();
    expect(list[0]).toMatchObject({
      displayName: '林老師',
      hasLineLinked: false,
      teaching: [{ id: 'ta-1', classId: 'c1', className: '向日葵班' }],
    });
  });

  it('不存在的使用者 → 404', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(makeService(prisma).getById('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsersService.create', () => {
  it('建立帳號同時給一個角色，並記稽核（不存姓名明文）', async () => {
    const prisma = makePrisma();
    await makeService(prisma).create(owner, { displayName: '陳老師', role: 'TEACHER' });

    expect(prisma.tx.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'u-new', role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null },
    });
    const entry = prisma.tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('user.create');
    expect(JSON.stringify(entry.metadata)).not.toContain('陳老師');
  });
});

describe('UsersService.update', () => {
  it('停用帳號 → 只改 status，不刪除資料', async () => {
    const prisma = makePrisma();
    await makeService(prisma).update(owner, 'u-1', { status: 'INACTIVE' });

    expect(prisma.tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'INACTIVE' } }),
    );
    expect(prisma.tx.auditLog.create.mock.calls[0][0].data.action).toBe('user.update');
  });

  it('最後一位在職園長不可停用（園所會沒有人能管理）', async () => {
    const prisma = makePrisma();
    prisma.userRole.findFirst.mockResolvedValue({ id: 'role-owner' }); // 這個人是園長
    prisma.user.count.mockResolvedValue(0); // 沒有其他在職園長

    await expect(
      makeService(prisma).update(owner, 'u-1', { status: 'INACTIVE' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tx.user.update).not.toHaveBeenCalled();
  });

  it('還有其他在職園長 → 可以停用', async () => {
    const prisma = makePrisma();
    prisma.userRole.findFirst.mockResolvedValue({ id: 'role-owner' });
    prisma.user.count.mockResolvedValue(1);

    await makeService(prisma).update(owner, 'u-1', { status: 'INACTIVE' });
    expect(prisma.tx.user.update).toHaveBeenCalledTimes(1);
  });

  it('沒有任何變更 → 400', async () => {
    const prisma = makePrisma();
    await expect(makeService(prisma).update(owner, 'u-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

// 角色增刪（Phase 9 階段3 ②b）。建錯要能改、老師兼家長要能表達、園長交接要能做，
// 但也不能讓行政自我升級或把園所鎖死。
describe('UsersService.grantRole', () => {
  const admin: UserActor = { id: 'u-admin', roles: [role('ADMIN')] };

  it('加上第二個身分（老師同時是家長 —— 幼兒園常態）', async () => {
    const prisma = makePrisma();
    await makeService(prisma).grantRole(owner, 'u-1', 'PARENT');

    expect(prisma.tx.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'u-1', role: 'PARENT', scopeType: 'SCHOOL', scopeId: null },
    });
    expect(prisma.tx.auditLog.create.mock.calls[0][0].data.action).toBe('user.role_grant');
  });

  it('已經有的身分不重複給 → 400', async () => {
    const prisma = makePrisma();
    await expect(makeService(prisma).grantRole(owner, 'u-1', 'TEACHER')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('行政不能把任何人升成園長（含自己）→ 403', async () => {
    const prisma = makePrisma();
    await expect(makeService(prisma).grantRole(admin, 'u-1', 'OWNER')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.tx.userRole.create).not.toHaveBeenCalled();
  });

  it('園長可以指派另一位園長（交接）', async () => {
    const prisma = makePrisma();
    await makeService(prisma).grantRole(owner, 'u-1', 'OWNER');
    expect(prisma.tx.userRole.create).toHaveBeenCalledTimes(1);
  });

  it('稽核只記角色，不記姓名', async () => {
    const prisma = makePrisma();
    await makeService(prisma).grantRole(owner, 'u-1', 'PARENT');
    const entry = prisma.tx.auditLog.create.mock.calls[0][0].data;
    expect(JSON.stringify(entry.metadata)).not.toContain('林老師');
    expect(entry.metadata).toMatchObject({ role: 'PARENT' });
  });
});

describe('UsersService.revokeRole', () => {
  const admin: UserActor = { id: 'u-admin', roles: [role('ADMIN')] };
  const twoRoles = [
    { role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null },
    { role: 'PARENT', scopeType: 'SCHOOL', scopeId: null },
  ];

  it('拔掉老師身分時一併解除任教班級（不留幽靈權限）', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(userRow({ roles: twoRoles }));

    await makeService(prisma).revokeRole(owner, 'u-1', 'TEACHER');

    expect(prisma.tx.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', role: 'TEACHER' },
    });
    expect(prisma.tx.teacherAssignment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u-1' },
    });
    expect(prisma.tx.auditLog.create.mock.calls[0][0].data.metadata).toMatchObject({
      role: 'TEACHER',
      removedTeaching: 1,
    });
  });

  it('拔掉家長身分時一併解除監護關聯', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(userRow({ roles: twoRoles }));

    await makeService(prisma).revokeRole(owner, 'u-1', 'PARENT');
    expect(prisma.tx.guardianship.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
  });

  it('還保有同類身分時不清空關聯（兼任娃娃車老師仍是老師）', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(
      userRow({
        roles: [
          { role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null },
          { role: 'BUS_TEACHER', scopeType: 'SCHOOL', scopeId: null },
        ],
      }),
    );

    await makeService(prisma).revokeRole(owner, 'u-1', 'BUS_TEACHER');
    expect(prisma.tx.teacherAssignment.deleteMany).not.toHaveBeenCalled();
  });

  it('最後一個身分不可移除 —— 那是離職，應該用停用', async () => {
    const prisma = makePrisma();
    await expect(makeService(prisma).revokeRole(owner, 'u-1', 'TEACHER')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.tx.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it('沒有的身分 → 404', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(userRow({ roles: twoRoles }));
    await expect(makeService(prisma).revokeRole(owner, 'u-1', 'ADMIN')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('行政不能拔掉園長身分 → 403', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(
      userRow({
        roles: [
          { role: 'OWNER', scopeType: 'SCHOOL', scopeId: null },
          { role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null },
        ],
      }),
    );
    await expect(makeService(prisma).revokeRole(admin, 'u-1', 'OWNER')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('最後一位園長的園長身分不可移除（園所會沒有人能管理）', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(
      userRow({
        roles: [
          { role: 'OWNER', scopeType: 'SCHOOL', scopeId: null },
          { role: 'TEACHER', scopeType: 'SCHOOL', scopeId: null },
        ],
      }),
    );
    prisma.userRole.findFirst.mockResolvedValue({ id: 'role-owner' });
    prisma.user.count.mockResolvedValue(0);

    await expect(makeService(prisma).revokeRole(owner, 'u-1', 'OWNER')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.tx.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it('seed 建立的 CLASS scope 角色也清得掉（不限 scope）', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(
      userRow({
        roles: [
          { role: 'TEACHER', scopeType: 'CLASS', scopeId: 'class-sunflower' },
          { role: 'PARENT', scopeType: 'SCHOOL', scopeId: null },
        ],
      }),
    );
    await makeService(prisma).revokeRole(owner, 'u-1', 'TEACHER');
    expect(prisma.tx.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', role: 'TEACHER' },
    });
  });
});
