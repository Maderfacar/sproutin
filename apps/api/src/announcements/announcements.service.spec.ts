import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnnouncementsService, AnnouncementActor } from './announcements.service';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// 公告：發布權限（SCHOOL=OWNER/ADMIN;CLASS=OWNER/ADMIN 或 TEACHER 自班）+ 同交易 Announcement/Outbox/Audit
// + 可見範圍過濾。mocked Prisma。

type TxMock = {
  announcement: { create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  outboxEvent: { create: jest.Mock };
  auditLog: { create: jest.Mock };
};
type PrismaMock = {
  school: { findFirst: jest.Mock };
  teacherAssignment: { findFirst: jest.Mock; findMany: jest.Mock };
  guardianship: { findMany: jest.Mock };
  announcement: { findMany: jest.Mock; findUnique: jest.Mock };
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
      update: jest.fn(async ({ where, data }) => ({ ...annRow({ id: where.id }), ...data })),
      delete: jest.fn(async () => ({})),
    },
    outboxEvent: { create: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

// 既有的一則公告（預設是導師 u-teacher 發的班級公告）。
const annRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'ann-1',
  schoolId: 'school-1',
  classId: 'class-sun',
  scope: 'CLASS',
  title: '向日葵班本週活動',
  body: '本週五戶外教學。',
  createdBy: 'u-teacher',
  createdAt: new Date('2026-08-15T00:00:00.000Z'),
  ...over,
});

function makePrisma(tx: TxMock): PrismaMock {
  return {
    school: { findFirst: jest.fn(async () => ({ id: 'school-1' })) },
    teacherAssignment: { findFirst: jest.fn(async () => ({ id: 'ta-1' })), findMany: jest.fn(async () => []) },
    guardianship: { findMany: jest.fn(async () => []) },
    announcement: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => annRow()) },
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


// 編輯與刪除（Human Owner 2026-08-20 定案：站內要能刪、能改；
// 誰能動＝園長、行政、發布的人自己）。
describe('AnnouncementsService.update', () => {
  it('發布的人自己 → 改得動標題與內文，且**不重新推播**', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);

    await makeService(prisma).update(teacher, 'ann-1', { title: '改過的標題' });

    expect(tx.announcement.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ann-1' }, data: { title: '改過的標題' } }),
    );
    // 改一個錯字不該讓全班家長的手機再響一次。
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
  });

  it('園長 → 改得動別人發的', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    await makeService(prisma).update(owner, 'ann-1', { body: '改內文' });
    expect(tx.announcement.update).toHaveBeenCalled();
  });

  it('不是發布者的老師 → 403（能發班級公告不代表能動同事那一則）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const other: AnnouncementActor = { id: 'u-other-teacher', roles: [role('TEACHER', 'class-sun')] };

    await expect(makeService(prisma).update(other, 'ann-1', { title: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.announcement.update).not.toHaveBeenCalled();
  });

  it('家長 → 403', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    await expect(makeService(prisma).update(parent, 'ann-1', { title: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('什麼都沒改 → 400', async () => {
    const prisma = makePrisma(makeTx());
    await expect(makeService(prisma).update(owner, 'ann-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('不存在 → 404', async () => {
    const prisma = makePrisma(makeTx());
    prisma.announcement.findUnique.mockResolvedValue(null);
    await expect(makeService(prisma).update(owner, 'nope', { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('稽核只記改了哪些欄位，不記標題內文（可能帶孩子的名字）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    await makeService(prisma).update(owner, 'ann-1', { title: '恭喜范小星得獎' });

    const entry = tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('announcement.update');
    expect(entry.metadata).toEqual({ fields: ['title'] });
    expect(JSON.stringify(entry.metadata)).not.toContain('范小星');
  });
});

describe('AnnouncementsService.remove', () => {
  it('發布的人自己 → 刪得掉，並記稽核', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);

    await makeService(prisma).remove(teacher, 'ann-1');

    expect(tx.announcement.delete).toHaveBeenCalledWith({ where: { id: 'ann-1' } });
    const entry = tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('announcement.delete');
    expect(entry.metadata).toEqual({ scope: 'CLASS', classId: 'class-sun' });
  });

  it('園長 → 刪得掉別人發的', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    await makeService(prisma).remove(owner, 'ann-1');
    expect(tx.announcement.delete).toHaveBeenCalled();
  });

  it('不是發布者的老師 → 403', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const other: AnnouncementActor = { id: 'u-other-teacher', roles: [role('TEACHER', 'class-sun')] };

    await expect(makeService(prisma).remove(other, 'ann-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.announcement.delete).not.toHaveBeenCalled();
  });

  it('不存在 → 404', async () => {
    const prisma = makePrisma(makeTx());
    prisma.announcement.findUnique.mockResolvedValue(null);
    await expect(makeService(prisma).remove(owner, 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
