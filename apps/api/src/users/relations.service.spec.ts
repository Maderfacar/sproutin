import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RelationsService } from './relations.service';
import { AuditService } from '../core/audit/audit.service';
import type { UserActor } from './users.service';

// 綁定/解除會直接改變「誰看得到誰」→ 驗證重複綁定被擋、對象不存在被擋、每筆都有稽核。

type TxMock = {
  guardianship: { create: jest.Mock; delete: jest.Mock };
  teacherAssignment: { create: jest.Mock; delete: jest.Mock };
  auditLog: { create: jest.Mock };
};
type PrismaMock = {
  tx: TxMock;
  user: { findUnique: jest.Mock };
  student: { findUnique: jest.Mock };
  class: { findUnique: jest.Mock };
  guardianship: { findFirst: jest.Mock; findUnique: jest.Mock };
  teacherAssignment: { findFirst: jest.Mock; findUnique: jest.Mock };
  $transaction: jest.Mock;
};

function makePrisma(): PrismaMock {
  const tx: TxMock = {
    guardianship: { create: jest.fn(async () => ({ id: 'g-new' })), delete: jest.fn(async () => ({})) },
    teacherAssignment: {
      create: jest.fn(async () => ({ id: 'ta-new' })),
      delete: jest.fn(async () => ({})),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  return {
    tx,
    // status 一定要有：新增關聯前會擋停用帳號（見 assertUserActive）。
    user: { findUnique: jest.fn(async () => ({ id: 'u-parent', status: 'ACTIVE' })) },
    student: { findUnique: jest.fn(async () => ({ id: 'stu-1' })) },
    class: { findUnique: jest.fn(async () => ({ id: 'c1' })) },
    guardianship: {
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => ({ id: 'g-1', userId: 'u-parent', studentId: 'stu-1' })),
    },
    teacherAssignment: {
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => ({ id: 'ta-1', userId: 'u-teacher', classId: 'c1' })),
    },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeService(prisma: PrismaMock): RelationsService {
  return new RelationsService(prisma as never, new AuditService(prisma as never));
}

const owner: UserActor = {
  id: 'u-owner',
  roles: [{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }],
};

describe('RelationsService — 家長綁定小孩', () => {
  it('綁定成功並記稽核', async () => {
    const prisma = makePrisma();
    const created = await makeService(prisma).addGuardianship(owner, {
      userId: 'u-parent',
      studentId: 'stu-1',
      relation: 'MOTHER',
    });

    expect(created).toEqual({ id: 'g-new' });
    expect(prisma.tx.auditLog.create.mock.calls[0][0].data.action).toBe('guardianship.add');
  });

  it('重複綁定同一組 → 409', async () => {
    const prisma = makePrisma();
    prisma.guardianship.findFirst.mockResolvedValue({ id: 'g-1' });

    await expect(
      makeService(prisma).addGuardianship(owner, {
        userId: 'u-parent',
        studentId: 'stu-1',
        relation: 'MOTHER',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.tx.guardianship.create).not.toHaveBeenCalled();
  });

  it('學生不存在 → 400，不寫入', async () => {
    const prisma = makePrisma();
    prisma.student.findUnique.mockResolvedValue(null);

    await expect(
      makeService(prisma).addGuardianship(owner, {
        userId: 'u-parent',
        studentId: 'nope',
        relation: 'MOTHER',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('解除不存在的綁定 → 404', async () => {
    const prisma = makePrisma();
    prisma.guardianship.findUnique.mockResolvedValue(null);
    await expect(makeService(prisma).removeGuardianship(owner, 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('解除綁定會記稽核（誰解除了誰對誰的監護）', async () => {
    const prisma = makePrisma();
    await makeService(prisma).removeGuardianship(owner, 'g-1');
    const entry = prisma.tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('guardianship.remove');
    expect(entry.metadata).toMatchObject({ userId: 'u-parent', studentId: 'stu-1' });
  });
});

describe('RelationsService — 老師編制班級', () => {
  it('編制成功並記稽核', async () => {
    const prisma = makePrisma();
    const created = await makeService(prisma).addTeacherAssignment(owner, {
      userId: 'u-teacher',
      classId: 'c1',
    });
    expect(created).toEqual({ id: 'ta-new' });
    expect(prisma.tx.auditLog.create.mock.calls[0][0].data.action).toBe('teacher_assignment.add');
  });

  it('重複編制同一班 → 409', async () => {
    const prisma = makePrisma();
    prisma.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
    await expect(
      makeService(prisma).addTeacherAssignment(owner, { userId: 'u-teacher', classId: 'c1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('班級不存在 → 400', async () => {
    const prisma = makePrisma();
    prisma.class.findUnique.mockResolvedValue(null);
    await expect(
      makeService(prisma).addTeacherAssignment(owner, { userId: 'u-teacher', classId: 'nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('解除編制會記稽核（老師從此看不到該班學生）', async () => {
    const prisma = makePrisma();
    await makeService(prisma).removeTeacherAssignment(owner, 'ta-1');
    const entry = prisma.tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('teacher_assignment.remove');
    expect(entry.metadata).toMatchObject({ userId: 'u-teacher', classId: 'c1' });
  });
});


// 停用的帳號不能再被指派班級或綁定小孩（Human Owner 2026-08-20 回報：
// 已停用的帳號仍可分配導師身分）。避免製造幽靈關聯 ——
// 班級名單上掛著一個登不進來的老師，之後帳號一旦重新啟用又會默默帶著權限回來。
describe('RelationsService — 停用帳號不得新增關聯', () => {
  it('停用的人不能被綁小孩', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique = jest.fn(async () => ({ id: 'u-parent', status: 'DISABLED' }));

    await expect(
      makeService(prisma).addGuardianship(owner, {
        userId: 'u-parent',
        studentId: 'stu-1',
        relation: 'MOTHER',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.tx.guardianship.create).not.toHaveBeenCalled();
  });

  it('停用的人不能被指派班級', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique = jest.fn(async () => ({ id: 'u-teacher', status: 'DISABLED' }));

    await expect(
      makeService(prisma).addTeacherAssignment(owner, { userId: 'u-teacher', classId: 'c1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.tx.teacherAssignment.create).not.toHaveBeenCalled();
  });

  // **移除**不受此限 —— 那正是清理停用帳號要做的事。
  it('停用的人身上的關聯仍然解除得掉', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique = jest.fn(async () => ({ id: 'u-teacher', status: 'DISABLED' }));

    await makeService(prisma).removeTeacherAssignment(owner, 'ta-1');

    expect(prisma.tx.teacherAssignment.delete).toHaveBeenCalled();
  });
});
