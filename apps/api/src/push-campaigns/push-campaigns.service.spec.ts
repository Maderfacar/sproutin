import { BadRequestException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import { AuditService } from '../core/audit/audit.service';
import { PushCampaignsService, type CampaignActor, type CreateCampaignInput } from './push-campaigns.service';

// 群發的建立端：api 只負責「排入」（寫紀錄 + Outbox + 稽核，同一交易），不負責送出。
// 重點在：人數要分「收得到／還沒綁定」兩個數字、按鈕網址在建立當下解析並存下來、
// 外部網址限 https、以及稽核不留訊息內容。

const role = (r: AuthUser['roles'][number]['role']) => ({
  role: r,
  scopeType: 'SCHOOL' as const,
  scopeId: null,
});
const owner: CampaignActor = { id: 'u-owner', roles: [role('OWNER')] };

const createdRow = (over: Record<string, unknown> = {}) => ({
  id: 'camp-1',
  template: 'GENERAL',
  audience: 'ALL_PARENTS',
  classId: null,
  title: '本週五園外教學延期',
  body: '因颱風影響，延至下週三。',
  imageUrl: null,
  buttonLabel: null,
  buttonUrl: null,
  fields: {},
  status: 'QUEUED',
  failureReason: null,
  recipientCount: 2,
  sentCount: 0,
  skippedCount: 0,
  createdBy: 'u-owner',
  createdAt: new Date('2026-08-17T02:00:00Z'),
  sentAt: null,
  ...over,
});

type TxMock = {
  pushCampaign: { create: jest.Mock };
  outboxEvent: { create: jest.Mock };
  auditLog: { create: jest.Mock };
};

function makePrisma(over: { users?: { lineIdentity: { lineUserId: string } | null }[]; liffId?: string | null } = {}) {
  const tx: TxMock = {
    pushCampaign: { create: jest.fn(async () => createdRow()) },
    outboxEvent: { create: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  return {
    tx,
    user: {
      findMany: jest.fn(async () =>
        over.users ?? [{ lineIdentity: { lineUserId: 'L-1' } }, { lineIdentity: { lineUserId: 'L-2' } }],
      ),
    },
    class: {
      findUnique: jest.fn(async (): Promise<{ id: string } | null> => ({ id: 'class-sun' })),
    },
    schoolConfig: {
      findFirst: jest.fn(async () => ({
        liffId: over.liffId === undefined ? 'liff-1' : over.liffId,
      })),
    },
    pushCampaign: { findMany: jest.fn(async () => [createdRow()]) },
    $transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb(tx)),
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>): PushCampaignsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PushCampaignsService(prisma as any, new AuditService(prisma as any));
}

function input(over: Partial<CreateCampaignInput> = {}): CreateCampaignInput {
  return {
    template: 'GENERAL',
    audience: 'ALL_PARENTS',
    classId: null,
    title: '本週五園外教學延期',
    body: '因颱風影響，延至下週三。',
    imageUrl: null,
    fields: {},
    button: null,
    ...over,
  };
}

describe('PushCampaignsService.previewRecipients', () => {
  // 只回一個數字會讓園長把「還沒綁定的人收不到」誤判成系統漏發。
  it('分別回「收得到」與「還沒綁定」兩個數字', async () => {
    const prisma = makePrisma({
      users: [{ lineIdentity: { lineUserId: 'L-1' } }, { lineIdentity: null }, { lineIdentity: null }],
    });

    await expect(makeService(prisma).previewRecipients('ALL_PARENTS', null)).resolves.toEqual({
      willReceive: 1,
      unbound: 2,
    });
  });

  it('選了「指定班級」卻沒給班級 → 400', async () => {
    await expect(makeService(makePrisma()).previewRecipients('CLASS', null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('PushCampaignsService.create', () => {
  it('同一交易寫入紀錄 + Outbox 事件 + 稽核', async () => {
    const prisma = makePrisma();
    const view = await makeService(prisma).create(owner, input());

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.tx.pushCampaign.create).toHaveBeenCalledTimes(1);
    expect(prisma.tx.outboxEvent.create).toHaveBeenCalledWith({
      data: { eventType: 'PushCampaignQueued', payload: { campaignId: 'camp-1' } },
    });
    expect(view.status).toBe('QUEUED');
  });

  it('recipientCount 記的是「真的收得到的人數」（未綁定者不算）', async () => {
    const prisma = makePrisma({
      users: [{ lineIdentity: { lineUserId: 'L-1' } }, { lineIdentity: null }],
    });
    await makeService(prisma).create(owner, input());

    expect(prisma.tx.pushCampaign.create.mock.calls[0]![0].data.recipientCount).toBe(1);
  });

  // 訊息內容屬敏感明文（docs/05 修正 C）。
  it('稽核只記對象與數量，不記標題與內文', async () => {
    const prisma = makePrisma();
    await makeService(prisma).create(owner, input());

    const entry = prisma.tx.auditLog.create.mock.calls[0]![0].data;
    expect(entry.action).toBe('push_campaign.create');
    expect(JSON.stringify(entry.metadata)).not.toContain('園外教學');
    expect(entry.metadata).toMatchObject({ audience: 'ALL_PARENTS', recipientCount: 2 });
  });

  it('按鈕連 App 內頁 → 建立當下就組成 LIFF 網址存起來', async () => {
    const prisma = makePrisma();
    await makeService(prisma).create(
      owner,
      input({ button: { label: '查看公告', page: 'announcement' } }),
    );

    expect(prisma.tx.pushCampaign.create.mock.calls[0]![0].data.buttonUrl).toBe(
      'https://liff.line.me/liff-1/announcement',
    );
  });

  it('按鈕連外部網址 → 原樣存下（Human Owner 定案：可外部）', async () => {
    const prisma = makePrisma();
    await makeService(prisma).create(
      owner,
      input({ button: { label: '線上報名', url: 'https://forms.example/signup' } }),
    );

    expect(prisma.tx.pushCampaign.create.mock.calls[0]![0].data.buttonUrl).toBe(
      'https://forms.example/signup',
    );
  });

  it('外部網址不是 https → 400（LINE 不吃，也不該把家長送去不明位置）', async () => {
    const prisma = makePrisma();
    await expect(
      makeService(prisma).create(
        owner,
        input({ button: { label: '報名', url: 'http://forms.example/signup' } }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('同時給了 App 內頁與外部網址 → 400，不猜他要哪一個', async () => {
    const prisma = makePrisma();
    await expect(
      makeService(prisma).create(
        owner,
        input({ button: { label: '報名', page: 'home', url: 'https://forms.example' } }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 沉默降級成「沒有按鈕」會讓園長以為送出去了卻沒有入口。
  it('要連 App 內頁但園所還沒設定 liffId → 400 說明原因', async () => {
    const prisma = makePrisma({ liffId: null });
    await expect(
      makeService(prisma).create(owner, input({ button: { label: '開啟', page: 'home' } })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('只留該版型認得的欄位（換版型後殘留的舊欄位不跟著送出）', async () => {
    const prisma = makePrisma();
    await makeService(prisma).create(
      owner,
      input({
        template: 'EVENT',
        fields: { eventDate: '9/20', eventPlace: '大禮堂', amount: 'NT$ 8,500' },
      }),
    );

    expect(prisma.tx.pushCampaign.create.mock.calls[0]![0].data.fields).toEqual({
      eventDate: '9/20',
      eventPlace: '大禮堂',
    });
  });

  it('指定班級但班級不存在 → 400', async () => {
    const prisma = makePrisma();
    prisma.class.findUnique.mockResolvedValue(null);
    await expect(
      makeService(prisma).create(owner, input({ audience: 'CLASS', classId: 'gone' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('收件範圍不是班級卻帶了班級 → 400（不默默忽略他選的東西）', async () => {
    const prisma = makePrisma();
    await expect(
      makeService(prisma).create(owner, input({ audience: 'STAFF', classId: 'class-sun' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
