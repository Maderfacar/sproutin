import { BadRequestException } from '@nestjs/common';
import { StudentsService, StudentActor } from './students.service';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// 驗證 /me/students 的後端過濾矩陣（Step 4）+ 學生管理寫入（階段2 刀2）——mocked Prisma，不需 DB。
type TxMock = {
  student: { create: jest.Mock; update: jest.Mock };
  auditLog: { create: jest.Mock };
};
type PrismaMock = {
  student: { findMany: jest.Mock; findUnique: jest.Mock };
  teacherAssignment: { findMany: jest.Mock };
  guardianship: { findMany: jest.Mock };
  class: { findUnique: jest.Mock };
  $transaction: jest.Mock;
  tx: TxMock;
};

function emptyPrisma(): PrismaMock {
  const tx: TxMock = {
    student: {
      create: jest.fn(async ({ data }) => ({
        id: 'stu-new',
        name: data.name,
        classId: data.classId,
        status: 'ACTIVE',
      })),
      update: jest.fn(async ({ data }) => ({
        id: 'stu-sun-1',
        name: data.name ?? '范小星',
        classId: data.classId ?? 'class-sun',
        status: data.status ?? 'ACTIVE',
      })),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  return {
    tx,
    student: { findMany: jest.fn(async () => []), findUnique: jest.fn() },
    teacherAssignment: { findMany: jest.fn(async () => []) },
    guardianship: { findMany: jest.fn(async () => []) },
    class: { findUnique: jest.fn(async () => ({ id: 'class-sun' })) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeService(prisma: PrismaMock): StudentsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new StudentsService(prisma as any, new AuditService(prisma as any));
}

const role = (r: AuthUser['roles'][number]['role'], scopeId: string | null = null) => ({
  role: r,
  scopeType: (scopeId ? 'CLASS' : 'SCHOOL') as 'CLASS' | 'SCHOOL',
  scopeId,
});

describe('StudentsService.listForUser', () => {
  it('OWNER：回全校學生（findMany all，不看 assignment/guardianship）', async () => {
    const prisma = emptyPrisma();
    prisma.student.findMany.mockResolvedValue([
      { id: 'stu-sun-1', name: 'A', classId: 'class-sun' },
      { id: 'stu-tul-1', name: 'B', classId: 'class-tulip' },
    ]);
    const service = makeService(prisma);

    const list = await service.listForUser('u-owner', [role('OWNER')]);

    expect(list).toHaveLength(2);
    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } }),
    );
    expect(prisma.teacherAssignment.findMany).not.toHaveBeenCalled();
    expect(prisma.guardianship.findMany).not.toHaveBeenCalled();
  });

  it('TEACHER：只回自己任教班級的學生', async () => {
    const prisma = emptyPrisma();
    prisma.teacherAssignment.findMany.mockResolvedValue([{ classId: 'class-sun' }]);
    prisma.student.findMany.mockResolvedValue([
      { id: 'stu-sun-1', name: '范小星', classId: 'class-sun' },
      { id: 'stu-sun-2', name: '范小陽', classId: 'class-sun' },
    ]);
    const service = makeService(prisma);

    const list = await service.listForUser('u-teacher', [role('TEACHER', 'class-sun')]);

    expect(list.map((s) => s.id)).toEqual(['stu-sun-1', 'stu-sun-2']);
    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { classId: { in: ['class-sun'] } } }),
    );
  });

  it('TEACHER 無任教班 → 空清單', async () => {
    const prisma = emptyPrisma();
    prisma.teacherAssignment.findMany.mockResolvedValue([]);
    const service = makeService(prisma);
    const list = await service.listForUser('u-teacher', [role('TEACHER')]);
    expect(list).toEqual([]);
    expect(prisma.student.findMany).not.toHaveBeenCalled();
  });

  it('PARENT：只回自己監護的小孩（可跨班）', async () => {
    const prisma = emptyPrisma();
    prisma.guardianship.findMany.mockResolvedValue([
      { student: { id: 'stu-sun-1', name: '范小星', classId: 'class-sun' } },
      { student: { id: 'stu-tul-1', name: '范小鬱', classId: 'class-tulip' } },
    ]);
    const service = makeService(prisma);

    const list = await service.listForUser('u-parent', [role('PARENT')]);

    expect(list.map((s) => s.id).sort()).toEqual(['stu-sun-1', 'stu-tul-1']);
  });

  it('多角色（TEACHER + PARENT）：聯集去重', async () => {
    const prisma = emptyPrisma();
    prisma.teacherAssignment.findMany.mockResolvedValue([{ classId: 'class-sun' }]);
    prisma.student.findMany.mockResolvedValue([
      { id: 'stu-sun-1', name: '范小星', classId: 'class-sun' },
    ]);
    prisma.guardianship.findMany.mockResolvedValue([
      { student: { id: 'stu-sun-1', name: '范小星', classId: 'class-sun' } }, // 重複
      { student: { id: 'stu-tul-1', name: '范小鬱', classId: 'class-tulip' } },
    ]);
    const service = makeService(prisma);

    const list = await service.listForUser('u-both', [role('TEACHER', 'class-sun'), role('PARENT')]);

    expect(list.map((s) => s.id).sort()).toEqual(['stu-sun-1', 'stu-tul-1']); // 去重
  });

  it('classId 篩選只縮小、不放寬：家長帶別班 classId 仍看不到別人的小孩', async () => {
    const prisma = emptyPrisma();
    prisma.guardianship.findMany.mockResolvedValue([
      { student: { id: 'stu-sun-1', name: '范小星', classId: 'class-sun' } },
    ]);
    const service = makeService(prisma);

    const list = await service.listForUser('u-parent', [role('PARENT')], 'class-tulip');

    expect(list).toEqual([]); // 別班 → 篩掉，不會回傳他人小孩
  });
});

const owner: StudentActor = { id: 'u-owner', roles: [role('OWNER')] };

describe('StudentsService 管理操作', () => {
  it('新增學生 → 寫入 + 同交易稽核（稽核不存姓名明文）', async () => {
    const prisma = emptyPrisma();
    const created = await makeService(prisma).create(owner, { name: '王小明', classId: 'class-sun' });

    expect(created.id).toBe('stu-new');
    const entry = prisma.tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('student.create');
    expect(entry.scopeId).toBe('class-sun');
    expect(JSON.stringify(entry.metadata)).not.toContain('王小明');
  });

  it('指定不存在的班級 → 400，不寫入', async () => {
    const prisma = emptyPrisma();
    prisma.class.findUnique.mockResolvedValue(null);

    await expect(
      makeService(prisma).create(owner, { name: '王小明', classId: 'nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tx.student.create).not.toHaveBeenCalled();
  });

  it('換班 → 稽核記錄原班與新班（供追溯）', async () => {
    const prisma = emptyPrisma();
    prisma.student.findUnique.mockResolvedValue({
      id: 'stu-sun-1',
      name: '范小星',
      classId: 'class-sun',
      status: 'ACTIVE',
    });

    await makeService(prisma).update(owner, 'stu-sun-1', { classId: 'class-tulip' });

    const entry = prisma.tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('student.update');
    expect(entry.metadata).toMatchObject({ fromClassId: 'class-sun', toClassId: 'class-tulip' });
  });

  it('畢業/離校以 status 表示（不刪資料）', async () => {
    const prisma = emptyPrisma();
    prisma.student.findUnique.mockResolvedValue({
      id: 'stu-sun-1',
      name: '范小星',
      classId: 'class-sun',
      status: 'ACTIVE',
    });

    const updated = await makeService(prisma).update(owner, 'stu-sun-1', { status: 'GRADUATED' });

    expect(updated.status).toBe('GRADUATED');
    expect(prisma.tx.student.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'GRADUATED' } }),
    );
  });

  it('沒有任何變更 → 400，不寫入也不記稽核', async () => {
    const prisma = emptyPrisma();
    prisma.student.findUnique.mockResolvedValue({
      id: 'stu-sun-1',
      name: '范小星',
      classId: 'class-sun',
      status: 'ACTIVE',
    });

    await expect(makeService(prisma).update(owner, 'stu-sun-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.tx.auditLog.create).not.toHaveBeenCalled();
  });
});
