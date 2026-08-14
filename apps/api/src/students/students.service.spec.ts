import { StudentsService } from './students.service';
import type { AuthUser } from '@sproutin/shared';

// 驗證 /me/students 的後端過濾矩陣（Step 4）——mocked Prisma，不需 DB。
type PrismaMock = {
  student: { findMany: jest.Mock; findUnique: jest.Mock };
  teacherAssignment: { findMany: jest.Mock };
  guardianship: { findMany: jest.Mock };
};

function emptyPrisma(): PrismaMock {
  return {
    student: { findMany: jest.fn(async () => []), findUnique: jest.fn() },
    teacherAssignment: { findMany: jest.fn(async () => []) },
    guardianship: { findMany: jest.fn(async () => []) },
  };
}

function makeService(prisma: PrismaMock): StudentsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new StudentsService(prisma as any);
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
});
