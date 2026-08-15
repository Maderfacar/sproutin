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
};

function makePrisma(): PrismaMock {
  return {
    notification: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'n1' })),
      update: jest.fn(async () => ({ id: 'n1', readAt: new Date() })),
    },
  };
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
