import { AuditLogsService } from './audit-logs.service';
import type { PrismaService } from '../core/prisma/prisma.service';

function prismaMock(
  rows: unknown[],
  total: number,
  users: { id: string; displayName: string }[] = [],
): {
  prisma: PrismaService;
  findMany: jest.Mock;
  count: jest.Mock;
  userFindMany: jest.Mock;
} {
  const findMany = jest.fn(async () => rows);
  const count = jest.fn(async () => total);
  const userFindMany = jest.fn(async () => users);
  const prisma = {
    auditLog: { findMany, count },
    user: { findMany: userFindMany },
    // 服務以 $transaction([findMany(...), count(...)]) 併發;mock 以 Promise.all 解析。
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  return { prisma, findMany, count, userFindMany };
}

describe('AuditLogsService.query', () => {
  it('預設 limit=50 / offset=0;where 由過濾條件組成', async () => {
    const { prisma, findMany } = prismaMock([{ id: 'a' }], 1);
    const service = new AuditLogsService(prisma);

    const page = await service.query({ resourceType: 'Leave', resourceId: 'leave-1', actor: 'u-1' });

    expect(page).toEqual({ data: [{ id: 'a', actorName: null }], total: 1, limit: 50, offset: 0 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resourceType: 'Leave', resourceId: 'leave-1', actorUserId: 'u-1' },
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('limit 超過上限 → 夾到 100;offset 負數 → 0', async () => {
    const { prisma, findMany } = prismaMock([], 0);
    const service = new AuditLogsService(prisma);

    await service.query({ limit: 500, offset: -10 });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100, skip: 0, where: {} }));
  });

  it('date range：有效 from/to → where.createdAt gte/lte', async () => {
    const { prisma, findMany } = prismaMock([], 0);
    const service = new AuditLogsService(prisma);

    await service.query({ from: '2026-08-01T00:00:00.000Z', to: '2026-08-31T23:59:59.000Z' });

    const arg = findMany.mock.calls[0][0] as { where: { createdAt?: { gte?: Date; lte?: Date } } };
    expect(arg.where.createdAt?.gte).toBeInstanceOf(Date);
    expect(arg.where.createdAt?.lte).toBeInstanceOf(Date);
  });

  it('補上操作者姓名;同一人多筆只查一次', async () => {
    const rows = [
      { id: 'a', actorUserId: 'u-1' },
      { id: 'b', actorUserId: 'u-1' },
      { id: 'c', actorUserId: null }, // 系統動作
    ];
    const { prisma, userFindMany } = prismaMock(rows, 3, [{ id: 'u-1', displayName: '王園長' }]);
    const service = new AuditLogsService(prisma);

    const page = await service.query({});

    expect(page.data.map((r) => r.actorName)).toEqual(['王園長', '王園長', null]);
    expect(userFindMany).toHaveBeenCalledTimes(1);
    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['u-1'] } } }),
    );
  });

  it('查不到的操作者 → actorName 為 null（不填空字串假裝正常）', async () => {
    const { prisma } = prismaMock([{ id: 'a', actorUserId: 'u-gone' }], 1, []);
    const service = new AuditLogsService(prisma);

    const page = await service.query({});

    expect(page.data[0]?.actorName).toBeNull();
  });

  it('全部都是系統動作 → 不發使用者查詢', async () => {
    const { prisma, userFindMany } = prismaMock([{ id: 'a', actorUserId: null }], 1);
    const service = new AuditLogsService(prisma);

    await service.query({});

    expect(userFindMany).not.toHaveBeenCalled();
  });

  it('無效日期 → 忽略（不加 createdAt 條件）', async () => {
    const { prisma, findMany } = prismaMock([], 0);
    const service = new AuditLogsService(prisma);

    await service.query({ from: 'not-a-date' });

    const arg = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where.createdAt).toBeUndefined();
  });
});
