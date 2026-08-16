import { BadRequestException } from '@nestjs/common';
import { SchoolConfigService, SchoolConfigActor } from './school-config.service';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// 園所設定：局部更新（只寫帶到的欄位）+ 與 AuditLog 同交易 + Json 欄位安全窄化。mocked Prisma。

const STORED = {
  id: 'cfg-1',
  brandName: '晴光幼兒園',
  logoUrl: null as string | null,
  primaryColor: '#2f6b4f',
  secondaryColor: '#74b48a',
  bannerUrl: null as string | null,
  featureFlags: { bus: false, payment: true, junk: 'not-a-boolean' },
  cardOrder: ['leave', 42, 'attendance'],
  leaveRequiresApproval: true,
  theme: 'warm',
  dashboardLayout: 'grid',
};

type TxMock = { schoolConfig: { update: jest.Mock }; auditLog: { create: jest.Mock } };
type PrismaMock = { schoolConfig: { findFirst: jest.Mock }; $transaction: jest.Mock };

function makeTx(): TxMock {
  return {
    schoolConfig: { update: jest.fn(async ({ data }) => ({ ...STORED, ...data })) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
}

function makePrisma(tx: TxMock, stored: unknown = STORED): PrismaMock {
  return {
    schoolConfig: { findFirst: jest.fn(async () => stored) },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
  };
}

function makeService(prisma: PrismaMock): SchoolConfigService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new SchoolConfigService(prisma as any, new AuditService(prisma as any));
}

const role = (r: AuthUser['roles'][number]['role']) => ({
  role: r,
  scopeType: 'SCHOOL' as const,
  scopeId: null,
});
const owner: SchoolConfigActor = { id: 'u-owner', roles: [role('OWNER')] };
const admin: SchoolConfigActor = { id: 'u-admin', roles: [role('ADMIN')] };

describe('SchoolConfigService.get', () => {
  it('回傳可編輯欄位；Json 欄位窄化（非 boolean 的 flag 與非字串的 cardOrder 項目被濾除）', async () => {
    const config = await makeService(makePrisma(makeTx())).get();
    expect(config.brandName).toBe('晴光幼兒園');
    expect(config.featureFlags).toEqual({ bus: false, payment: true });
    expect(config.cardOrder).toEqual(['leave', 'attendance']);
  });

  it('DB 尚未 seed（無 SchoolConfig）→ 400', async () => {
    const prisma = makePrisma(makeTx(), null);
    await expect(makeService(prisma).get()).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SchoolConfigService.update', () => {
  it('只更新帶到的欄位；其餘欄位不出現在 update data', async () => {
    const tx = makeTx();
    await makeService(makePrisma(tx)).update(owner, { brandName: '新名字' });

    const { data } = tx.schoolConfig.update.mock.calls[0][0];
    expect(data).toEqual({ brandName: '新名字' });
    expect(data.primaryColor).toBeUndefined();
  });

  it('logoUrl 傳 null（清除圖片）視為有效變更，不會被當成「沒帶」', async () => {
    const tx = makeTx();
    await makeService(makePrisma(tx)).update(owner, { logoUrl: null });
    expect(tx.schoolConfig.update.mock.calls[0][0].data).toEqual({ logoUrl: null });
  });

  it('與 AuditLog 同一交易寫入，metadata 只記欄位名（不存整包設定值）', async () => {
    const tx = makeTx();
    await makeService(makePrisma(tx)).update(admin, {
      primaryColor: '#123456',
      featureFlags: { payment: true },
    });

    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    const entry = tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('school.config.update');
    expect(entry.resourceType).toBe('SchoolConfig');
    expect(entry.actorUserId).toBe('u-admin');
    expect(entry.result).toBe('SUCCESS');
    expect(entry.metadata).toEqual({ fields: ['primaryColor', 'featureFlags'] });
  });

  it('空的更新內容 → 400，不寫入也不記稽核', async () => {
    const tx = makeTx();
    await expect(makeService(makePrisma(tx)).update(owner, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.schoolConfig.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
