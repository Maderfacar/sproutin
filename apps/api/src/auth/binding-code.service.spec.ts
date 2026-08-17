import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import { AuditService } from '../core/audit/audit.service';
import { BindingCodeService, BindingActor, formatCode, normalizeCode } from './binding-code.service';

// 綁定碼是「把人放進系統」的憑證，錯誤處理與失效規則就是安全邊界，因此測得比一般功能密。

type TxMock = {
  bindingCode: { updateMany: jest.Mock; create: jest.Mock; update: jest.Mock };
  lineIdentity: { create: jest.Mock; delete: jest.Mock };
  auditLog: { create: jest.Mock };
};

type PrismaMock = {
  bindingCode: { findUnique: jest.Mock; findMany: jest.Mock };
  user: { findUnique: jest.Mock };
  lineIdentity: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

const FUTURE = new Date(Date.now() + 86_400_000);
const PAST = new Date(Date.now() - 86_400_000);

function makeTx(): TxMock {
  return {
    bindingCode: {
      updateMany: jest.fn(async () => ({ count: 1 })),
      create: jest.fn(async ({ data }) => ({
        id: 'bc-1',
        code: data.code,
        userId: data.userId,
        expiresAt: data.expiresAt,
        usedAt: null,
        revokedAt: null,
        createdAt: new Date(),
      })),
      update: jest.fn(async () => ({})),
    },
    lineIdentity: { create: jest.fn(async () => ({})), delete: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock): PrismaMock {
  return {
    bindingCode: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    user: { findUnique: jest.fn(async () => ({ id: 'u-1', displayName: '張媽媽', status: 'ACTIVE', lineIdentity: null })) },
    lineIdentity: { findUnique: jest.fn(async () => null) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeService(prisma: PrismaMock): BindingCodeService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BindingCodeService(prisma as any, new AuditService(prisma as any));
}

const role = (r: AuthUser['roles'][number]['role']) => ({
  role: r,
  scopeType: 'SCHOOL' as const,
  scopeId: null,
});
const admin: BindingActor = { id: 'u-admin', roles: [role('ADMIN')] };

describe('綁定碼的格式處理', () => {
  it('顯示時切成兩組四碼，好念好抄', () => {
    expect(formatCode('ABCD2345')).toBe('ABCD-2345');
  });

  it('輸入時容忍大小寫、空白與連字號（家長常照著紙上連字號一起打）', () => {
    expect(normalizeCode('abcd-2345')).toBe('ABCD2345');
    expect(normalizeCode(' ABCD 2345 ')).toBe('ABCD2345');
  });

  it('不自動竄改看似看錯的字元（字母表已排除易混淆字，沒有安全的猜法）', () => {
    expect(normalizeCode('OOOO1111')).toBe('OOOO1111');
  });
});

describe('BindingCodeService.issue', () => {
  it('簽發新碼時，同一帳號既有未使用的碼一併作廢（舊條子不該永久有效）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const service = makeService(prisma);

    const view = await service.issue(admin, 'u-1');

    expect(tx.bindingCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u-1', usedAt: null, revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
    expect(view.code).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  });

  it('稽核不記碼本身（碼等同憑證明文）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const service = makeService(prisma);

    const view = await service.issue(admin, 'u-1');

    const audit = tx.auditLog.create.mock.calls[0][0].data;
    expect(audit.action).toBe('binding_code.issue');
    expect(JSON.stringify(audit.metadata)).not.toContain(view.code.replace('-', ''));
  });

  it('帳號已綁過 LINE → 拒發（避免重複綁定造成混淆）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.user.findUnique.mockResolvedValue({
      id: 'u-1',
      displayName: '張媽媽',
      status: 'ACTIVE',
      lineIdentity: { id: 'li-1' },
    });
    const service = makeService(prisma);

    await expect(service.issue(admin, 'u-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('已停用的帳號 → 拒發', async () => {
    const prisma = makePrisma(makeTx());
    prisma.user.findUnique.mockResolvedValue({
      id: 'u-1',
      displayName: '張媽媽',
      status: 'INACTIVE',
      lineIdentity: null,
    });
    const service = makeService(prisma);

    await expect(service.issue(admin, 'u-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('查無帳號 → NotFound', async () => {
    const prisma = makePrisma(makeTx());
    prisma.user.findUnique.mockResolvedValue(null);
    const service = makeService(prisma);

    await expect(service.issue(admin, 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('BindingCodeService.redeem', () => {
  const validRow = {
    id: 'bc-1',
    userId: 'u-1',
    expiresAt: FUTURE,
    usedAt: null,
    revokedAt: null,
    user: { id: 'u-1', status: 'ACTIVE', lineIdentity: null },
  };

  it('有效碼 → 建立 LineIdentity、標記已使用、回傳綁到的 userId', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.bindingCode.findUnique.mockResolvedValue(validRow);
    const service = makeService(prisma);

    const userId = await service.redeem('abcd-2345', 'Uline123');

    expect(userId).toBe('u-1');
    expect(tx.lineIdentity.create).toHaveBeenCalledWith({
      data: { lineUserId: 'Uline123', userId: 'u-1' },
    });
    expect(tx.bindingCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bc-1', usedAt: null, revokedAt: null },
        data: expect.objectContaining({ usedByLineUserId: 'Uline123' }),
      }),
    );
  });

  it('稽核不記 LINE userId 與碼本身（皆為識別性資料）', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.bindingCode.findUnique.mockResolvedValue(validRow);
    const service = makeService(prisma);

    await service.redeem('abcd-2345', 'Uline123');

    const audit = tx.auditLog.create.mock.calls[0][0].data;
    expect(JSON.stringify(audit.metadata)).not.toContain('Uline123');
    expect(JSON.stringify(audit.metadata)).not.toContain('ABCD2345');
  });

  it.each([
    ['查無此碼', null],
    ['已使用過', { ...validRow, usedAt: new Date() }],
    ['已被作廢', { ...validRow, revokedAt: new Date() }],
    ['已過期', { ...validRow, expiresAt: PAST }],
  ])('%s → 一律回同一個錯誤（不提供可探測有效碼的介面）', async (_label, row) => {
    const prisma = makePrisma(makeTx());
    prisma.bindingCode.findUnique.mockResolvedValue(row);
    const service = makeService(prisma);

    await expect(service.redeem('abcd-2345', 'Uline123')).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'binding_code_invalid' }),
    });
  });

  it('長度不對 → 直接拒絕，不查資料庫', async () => {
    const prisma = makePrisma(makeTx());
    const service = makeService(prisma);

    await expect(service.redeem('ABC', 'Uline123')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.bindingCode.findUnique).not.toHaveBeenCalled();
  });

  it('這個 LINE 帳號已綁過別人 → 拒絕（一個 LINE 只能是一個人）', async () => {
    const prisma = makePrisma(makeTx());
    prisma.bindingCode.findUnique.mockResolvedValue(validRow);
    prisma.lineIdentity.findUnique.mockResolvedValue({ id: 'li-existing' });
    const service = makeService(prisma);

    await expect(service.redeem('abcd-2345', 'Uline123')).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'line_already_bound' }),
    });
  });

  it('兩人同時送同一組碼 → 只有先搶到的成功（樂觀鎖）', async () => {
    const tx = makeTx();
    tx.bindingCode.updateMany.mockResolvedValue({ count: 0 }); // 已被別人搶走
    const prisma = makePrisma(tx);
    prisma.bindingCode.findUnique.mockResolvedValue(validRow);
    const service = makeService(prisma);

    await expect(service.redeem('abcd-2345', 'Uline123')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.lineIdentity.create).not.toHaveBeenCalled();
  });
});

describe('BindingCodeService.unbind', () => {
  it('解綁後帳號回到未綁定狀態，帳號本身不刪除', async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);
    prisma.lineIdentity.findUnique.mockResolvedValue({ id: 'li-1', userId: 'u-1' });
    const service = makeService(prisma);

    await service.unbind(admin, 'u-1');

    expect(tx.lineIdentity.delete).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
    expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe('user.line_unbind');
  });

  it('本來就沒綁 → NotFound', async () => {
    const prisma = makePrisma(makeTx());
    prisma.lineIdentity.findUnique.mockResolvedValue(null);
    const service = makeService(prisma);

    await expect(service.unbind(admin, 'u-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
