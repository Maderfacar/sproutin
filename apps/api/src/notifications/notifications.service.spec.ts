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
