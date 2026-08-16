import { ScopeResolver } from './scope-resolver.service';
import type { AuthUser } from '@sproutin/shared';

// 用 mocked Prisma 驗證資料列級授權矩陣（docs/05 §2-3）——不需 DB。
type PrismaMock = {
  student: { findUnique: jest.Mock };
  teacherAssignment: { findFirst: jest.Mock };
  guardianship: { findFirst: jest.Mock };
};

function makeResolver(prisma: PrismaMock): ScopeResolver {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ScopeResolver(prisma as any);
}

const role = (r: AuthUser['roles'][number]['role'], scopeId: string | null = null) => ({
  role: r,
  scopeType: (scopeId ? 'CLASS' : 'SCHOOL') as 'CLASS' | 'SCHOOL',
  scopeId,
});

function emptyPrisma(): PrismaMock {
  return {
    student: { findUnique: jest.fn(async () => null) },
    teacherAssignment: { findFirst: jest.fn(async () => null) },
    guardianship: { findFirst: jest.fn(async () => null) },
  };
}

describe('ScopeResolver.canAccessStudent', () => {
  it('OWNER：全校 → allow（不需查 DB）', async () => {
    const prisma = emptyPrisma();
    const resolver = makeResolver(prisma);
    await expect(resolver.canAccessStudent('u-owner', [role('OWNER')], 'stu-x')).resolves.toBe(true);
    expect(prisma.student.findUnique).not.toHaveBeenCalled();
  });

  it('ADMIN：全校 → allow', async () => {
    const resolver = makeResolver(emptyPrisma());
    await expect(resolver.canAccessStudent('u-admin', [role('ADMIN')], 'stu-x')).resolves.toBe(true);
  });

  it('TEACHER：學生在自己任教班 → allow', async () => {
    const prisma = emptyPrisma();
    prisma.student.findUnique.mockResolvedValue({ classId: 'class-sun' });
    prisma.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canAccessStudent('u-teacher', [role('TEACHER', 'class-sun')], 'stu-sun-1'),
    ).resolves.toBe(true);
    expect(prisma.teacherAssignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u-teacher', classId: 'class-sun' } }),
    );
  });

  it('TEACHER：學生在他班 → deny', async () => {
    const prisma = emptyPrisma();
    prisma.student.findUnique.mockResolvedValue({ classId: 'class-tulip' });
    prisma.teacherAssignment.findFirst.mockResolvedValue(null); // 該老師無此班 assignment
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canAccessStudent('u-teacher', [role('TEACHER', 'class-sun')], 'stu-tul-1'),
    ).resolves.toBe(false);
  });

  it('PARENT：自己監護的小孩 → allow', async () => {
    const prisma = emptyPrisma();
    prisma.guardianship.findFirst.mockResolvedValue({ id: 'g-1' });
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canAccessStudent('u-parent', [role('PARENT')], 'stu-sun-1'),
    ).resolves.toBe(true);
    expect(prisma.guardianship.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u-parent', studentId: 'stu-sun-1' } }),
    );
  });

  it('PARENT：非自己小孩 → deny', async () => {
    const prisma = emptyPrisma();
    prisma.guardianship.findFirst.mockResolvedValue(null);
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canAccessStudent('u-parent', [role('PARENT')], 'stu-other'),
    ).resolves.toBe(false);
  });

  it('GUARDIAN：監護關係存在 → allow', async () => {
    const prisma = emptyPrisma();
    prisma.guardianship.findFirst.mockResolvedValue({ id: 'g-2' });
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canAccessStudent('u-grandpa', [role('GUARDIAN')], 'stu-sun-1'),
    ).resolves.toBe(true);
  });
});

describe('ScopeResolver.canManageStudentClass', () => {
  it('OWNER：全校 → allow（不需查 DB）', async () => {
    const prisma = emptyPrisma();
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canManageStudentClass('u-owner', [role('OWNER')], 'stu-x'),
    ).resolves.toBe(true);
    expect(prisma.student.findUnique).not.toHaveBeenCalled();
  });

  it('ADMIN：全校 → allow', async () => {
    const resolver = makeResolver(emptyPrisma());
    await expect(
      resolver.canManageStudentClass('u-admin', [role('ADMIN')], 'stu-x'),
    ).resolves.toBe(true);
  });

  it('TEACHER：學生在自己任教班 → allow', async () => {
    const prisma = emptyPrisma();
    prisma.student.findUnique.mockResolvedValue({ classId: 'class-sun' });
    prisma.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canManageStudentClass('u-teacher', [role('TEACHER', 'class-sun')], 'stu-sun-1'),
    ).resolves.toBe(true);
  });

  it('TEACHER：學生在他班 → deny', async () => {
    const prisma = emptyPrisma();
    prisma.student.findUnique.mockResolvedValue({ classId: 'class-tulip' });
    prisma.teacherAssignment.findFirst.mockResolvedValue(null);
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canManageStudentClass('u-teacher', [role('TEACHER', 'class-sun')], 'stu-tul-1'),
    ).resolves.toBe(false);
  });

  it('PARENT：家長非班級管理者 → deny（即使是自己小孩）', async () => {
    const prisma = emptyPrisma();
    prisma.guardianship.findFirst.mockResolvedValue({ id: 'g-1' }); // 有監護關係
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canManageStudentClass('u-parent', [role('PARENT')], 'stu-sun-1'),
    ).resolves.toBe(false);
    expect(prisma.guardianship.findFirst).not.toHaveBeenCalled(); // 管理者判斷不看監護關係
  });
});

describe('ScopeResolver.canManageClass', () => {
  it('OWNER：全校 → allow（不需查 DB）', async () => {
    const prisma = emptyPrisma();
    const resolver = makeResolver(prisma);
    await expect(resolver.canManageClass('u-owner', [role('OWNER')], 'class-sun')).resolves.toBe(true);
    expect(prisma.teacherAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('TEACHER：自己任教的班 → allow', async () => {
    const prisma = emptyPrisma();
    prisma.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canManageClass('u-teacher', [role('TEACHER', 'class-sun')], 'class-sun'),
    ).resolves.toBe(true);
    expect(prisma.teacherAssignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u-teacher', classId: 'class-sun' } }),
    );
  });

  it('TEACHER：非自己任教的班 → deny', async () => {
    const prisma = emptyPrisma();
    prisma.teacherAssignment.findFirst.mockResolvedValue(null);
    const resolver = makeResolver(prisma);
    await expect(
      resolver.canManageClass('u-teacher', [role('TEACHER', 'class-sun')], 'class-tulip'),
    ).resolves.toBe(false);
  });

  it('PARENT：非管理者 → deny', async () => {
    const resolver = makeResolver(emptyPrisma());
    await expect(resolver.canManageClass('u-parent', [role('PARENT')], 'class-sun')).resolves.toBe(false);
  });
});
