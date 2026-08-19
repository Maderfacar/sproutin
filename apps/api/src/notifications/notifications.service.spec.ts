import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

// 站內通知讀取端：本人過濾 + 標記已讀（idempotent）。mocked Prisma。

type PrismaMock = {
  notification: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    update: jest.Mock;
  };
  // 訊息中心的人話是讀取時 join 補上的（見 notification-summary）。
  student: { findMany: jest.Mock };
  announcement: { findMany: jest.Mock };
  message: { findMany: jest.Mock };
  user: { findMany: jest.Mock };
  // relation=GUARDIAN 要知道「我監護哪幾個小孩、他們在哪一班」。
  guardianship: { findMany: jest.Mock };
};

function makePrisma(): PrismaMock {
  return {
    notification: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'n1' })),
      update: jest.fn(async () => ({ id: 'n1', readAt: new Date() })),
    },
    student: { findMany: jest.fn(async () => [{ id: 'stu-1', name: '小宇' }]) },
    announcement: { findMany: jest.fn(async () => []) },
    message: { findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    guardianship: { findMany: jest.fn(async () => []) },
  } as PrismaMock;
}

function makeService(prisma: PrismaMock): NotificationsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NotificationsService(prisma as any);
}

describe('NotificationsService.listForUser', () => {
  it('預設 → 依 userId 過濾、createdAt desc', async () => {
    const prisma = makePrisma();
    await makeService(prisma).listForUser({ id: 'u1' }, false);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, orderBy: { createdAt: 'desc' } }),
    );
  });

  it('unread=true → where 增加 readAt:null', async () => {
    const prisma = makePrisma();
    await makeService(prisma).listForUser({ id: 'u1' }, true);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', readAt: null } }),
    );
  });
});

// relation=GUARDIAN（Human Owner 2026-08-20 回報：家長身分的訊息中心看得到別人小孩的聯絡簿）。
//
// 這一組通知**全部都是發給本人的**（他同時是老師），所以不是權限問題 ——
// 是世界混在一起。切到家長身分之後，收件匣裡只該留家長那一半。
describe('NotificationsService.listForUser（relation=GUARDIAN）', () => {
  const rows = [
    { id: 'n-mine', type: 'CommunicationBookPublished', payload: { studentId: 'stu-mine' }, readAt: null, createdAt: new Date() },
    { id: 'n-other', type: 'CommunicationBookPublished', payload: { studentId: 'stu-other' }, readAt: null, createdAt: new Date() },
    { id: 'n-school', type: 'AnnouncementPublished', payload: { announcementId: 'a-school' }, readAt: null, createdAt: new Date() },
    { id: 'n-myclass', type: 'AnnouncementPublished', payload: { announcementId: 'a-myclass' }, readAt: null, createdAt: new Date() },
    { id: 'n-otherclass', type: 'AnnouncementPublished', payload: { announcementId: 'a-otherclass' }, readAt: null, createdAt: new Date() },
    { id: 'n-system', type: 'attendance.override_conflict', payload: {}, readAt: null, createdAt: new Date() },
  ];

  function guardianPrisma(): PrismaMock {
    const prisma = makePrisma();
    prisma.notification.findMany = jest.fn(async () => rows);
    prisma.guardianship.findMany = jest.fn(async () => [
      { student: { id: 'stu-mine', classId: 'c-mine' } },
    ]);
    prisma.announcement.findMany = jest.fn(async () => [
      { id: 'a-school', classId: null, title: '全校' },
      { id: 'a-myclass', classId: 'c-mine', title: '我的班' },
      { id: 'a-otherclass', classId: 'c-other', title: '別班' },
    ]);
    return prisma;
  }

  it('別人小孩的通知不會出現', async () => {
    const ids = (await makeService(guardianPrisma()).listForUser({ id: 'u1' }, false, 'GUARDIAN')).map(
      (n) => n.id,
    );
    expect(ids).toContain('n-mine');
    expect(ids).not.toContain('n-other');
  });

  it('全校公告留著、我小孩那一班的公告留著、別班的不留', async () => {
    const ids = (await makeService(guardianPrisma()).listForUser({ id: 'u1' }, false, 'GUARDIAN')).map(
      (n) => n.id,
    );
    expect(ids).toContain('n-school');
    expect(ids).toContain('n-myclass');
    expect(ids).not.toContain('n-otherclass');
  });

  it('與特定孩子無關的系統通知一律留著', async () => {
    const ids = (await makeService(guardianPrisma()).listForUser({ id: 'u1' }, false, 'GUARDIAN')).map(
      (n) => n.id,
    );
    expect(ids).toContain('n-system');
  });

  // 只縮小、永遠不放大 —— 就算他是園長。
  it('沒有監護關係 → 只剩系統通知與全校公告', async () => {
    const prisma = guardianPrisma();
    prisma.guardianship.findMany = jest.fn(async () => []);
    const ids = (await makeService(prisma).listForUser({ id: 'u1' }, false, 'GUARDIAN')).map((n) => n.id);
    expect(ids).toEqual(['n-school', 'n-system']);
  });

  // 被濾掉的孩子連名字都不必查 —— 過濾要在 join 名稱之前。
  it('被濾掉的孩子不會出現在名稱查詢裡', async () => {
    const prisma = guardianPrisma();
    await makeService(prisma).listForUser({ id: 'u1' }, false, 'GUARDIAN');
    const call = prisma.student.findMany.mock.calls.at(-1)?.[0] as
      | { where: { id: { in: string[] } } }
      | undefined;
    expect(call?.where.id.in).toEqual(['stu-mine']);
  });

  it('不帶 relation → 一則都不過濾（校方身分看到的是全部）', async () => {
    const ids = (await makeService(guardianPrisma()).listForUser({ id: 'u1' }, false)).map((n) => n.id);
    expect(ids).toHaveLength(rows.length);
  });
});

describe('NotificationsService.markRead', () => {
  it('本人未讀 → update readAt', async () => {
    const prisma = makePrisma();
    prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1', readAt: null });
    await makeService(prisma).markRead({ id: 'u1' }, 'n1');
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'n1' }, data: { readAt: expect.any(Date) } }),
    );
  });

  it('已讀 → 不再 update（idempotent）', async () => {
    const prisma = makePrisma();
    prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1', readAt: new Date() });
    await makeService(prisma).markRead({ id: 'u1' }, 'n1');
    expect(prisma.notification.update).not.toHaveBeenCalled();
    expect(prisma.notification.findUniqueOrThrow).toHaveBeenCalled();
  });

  it('他人通知 → Forbidden', async () => {
    const prisma = makePrisma();
    prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'other', readAt: null });
    await expect(makeService(prisma).markRead({ id: 'u1' }, 'n1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('不存在 → NotFound', async () => {
    const prisma = makePrisma();
    prisma.notification.findUnique.mockResolvedValue(null);
    await expect(makeService(prisma).markRead({ id: 'u1' }, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});


describe('NotificationsService 的訊息中心欄位', () => {
  const rows = [
    { id: 'n1', type: 'LeaveApproved', payload: { studentId: 'stu-1' }, readAt: null, createdAt: new Date() },
    { id: 'n2', type: 'LeaveRejected', payload: { studentId: 'stu-1' }, readAt: null, createdAt: new Date() },
    { id: 'n3', type: 'AnnouncementPublished', payload: { announcementId: 'ann-1' }, readAt: null, createdAt: new Date() },
  ];

  it('每一則都補上看得懂的標題與副標', async () => {
    const prisma = makePrisma();
    prisma.notification.findMany.mockResolvedValueOnce(rows);
    prisma.announcement.findMany.mockResolvedValueOnce([
      { id: 'ann-1', title: '校外教學通知單', classId: null },
    ]);

    const result = await makeService(prisma).listForUser({ id: 'u1' }, false);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.title)).toEqual([
      '小宇 請假已核准',
      '小宇 請假已駁回',
      '校外教學通知單',
    ]);
    expect(result.map((r) => r.subtitle)).toEqual(['請假 · 小宇', '請假 · 小宇', '全校公告']);
  });

  // N+1 防線：三則通知提到同一個學生，學生只能查一次。
  it('相同資源只查一次，不是每則通知各查一次', async () => {
    const prisma = makePrisma();
    prisma.notification.findMany.mockResolvedValueOnce(rows);

    await makeService(prisma).listForUser({ id: 'u1' }, false);

    expect(prisma.student.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['stu-1'] } } }),
    );
  });

  // 這一批沒有人提到公告 → 不該白跑一趟資料庫。
  it('沒人用到的資源不查', async () => {
    const prisma = makePrisma();
    prisma.notification.findMany.mockResolvedValueOnce([rows[0]]);

    await makeService(prisma).listForUser({ id: 'u1' }, false);

    expect(prisma.announcement.findMany).not.toHaveBeenCalled();
    expect(prisma.message.findMany).not.toHaveBeenCalled();
  });
});
