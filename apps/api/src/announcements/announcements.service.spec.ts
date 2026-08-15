import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AnnouncementsService, AnnouncementActor } from './announcements.service';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// 公告：發布權限（SCHOOL=OWNER/ADMIN;CLASS=OWNER/ADMIN 或 TEACHER 自班）+ 同交易 Announcement/Outbox/Audit
// + 可見範圍過濾。mocked Prisma。

type TxMock = {
  announcement: { create: jest.Mock };
  outboxEvent: { create: jest.Mock };
  auditLog: { create: jest.Mock };
};
type PrismaMock = {
  school: { findFirst: jest.Mock };
  teacherAssignment: { findFirst: jest.Mock; findMany: jest.Mock };
  guardianship: { findMany: jest.Mock };
  announcement: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

function makeTx(): TxMock {
  return {
    announcement: {
      create: jest.fn(async ({ data }) => ({
        id: 'ann-1',
        schoolId: data.schoolId,
        classId: data.classId,
        scope: data.scope,
        title: data.title,
        body: data.body,
        createdBy: data.createdBy,
        createdAt: new Date('2026-08-15T00:00:00.000Z'),
      })),
    },
    outboxEvent: { create: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock): PrismaMock {
  return {
    school: { findFirst: jest.fn(async () => ({ id: 'school-1' })) },
    teacherAssignment: { findFirst: jest.fn(async () => ({ id: 'ta-1' })), findMany: jest.fn(async () => []) },
    guardianship: { findMany: jest.fn(async () => []) },
    announcement: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeService(prisma: PrismaMock): AnnouncementsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new AnnouncementsService(prisma as any, new AuditService(prisma as any));
}

const role = (r: AuthUser['roles'][number]['role'], scopeId: string | null = null) => ({
  role: r,
  scopeType: (scopeId ? 'CLASS' : 'SCHOOL') as 'CLASS' | 'SCHOOL',
  scopeId,
});
const owner: AnnouncementActor = { id: 'u-owner', roles: [role('OWNER')] };
const teacher: AnnouncementActor = { id: 'u-teacher', roles: [role('TEACHER', 'class-sun')] };
const parent: AnnouncementActor = { id: 'u-parent', roles: [role('PARENT')] };

describe('AnnouncementsService.publish', () => {
  it('OWNER 發全校 → 建 Announcement(classId=null) + AnnouncementPublished + audit', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const ann = await makeService(prisma).publish(owner, { scope: 'SCHOOL', title: 't', body: 'b' });

    expect(ann.classId).toBeNull();
    expect(tx.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ scope: 'SCHOOL', classId: null, createdBy: 'u-owner' }) }),
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'AnnouncementPublished' }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'announcement.publish' }) }),
    );
  });

  it('TEACHER 發全校 → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    await expect(makeService(prisma).publish(teacher, { scope: 'SCHOOL', title: 't', body: 'b' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('TEACHER 發自班 → 允許', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
    const ann = await makeService(prisma).publish(teacher, { scope: 'CLASS', classId: 'class-sun', title: 't', body: 'b' });
    expect(ann.classId).toBe('class-sun');
  });

  it('TEACHER 發他班 → Forbidden', async () => {
    const prisma = makePrisma(makeTx());
    prisma.teacherAssignment.findFirst.mockResolvedValue(null);
    await expect(
      makeService(prisma).publish(teacher, { scope: 'CLASS', classId: 'class-other', title: 't', body: 'b' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('CLASS 但缺 classId → BadRequest', async () => {
    const prisma = makePrisma(makeTx());
    await expect(makeService(prisma).publish(owner, { scope: 'CLASS', title: 't', body: 'b' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('AnnouncementsService.listForUser', () => {
  it('OWNER → 全部公告', async () => {
    const prisma = makePrisma(makeTx());
    await makeService(prisma).listForUser(owner);
    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
    // OWNER 分支不帶 where OR
    expect(prisma.announcement.findMany.mock.calls[0][0].where).toBeUndefined();
  });

  it('PARENT → 全校公告 + 自己小孩班級公告', async () => {
    const prisma = makePrisma(makeTx());
    prisma.guardianship.findMany.mockResolvedValue([{ student: { classId: 'class-sun' } }]);
    await makeService(prisma).listForUser(parent);
    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ scope: 'SCHOOL' }, { classId: { in: ['class-sun'] } }] } }),
    );
  });
});
