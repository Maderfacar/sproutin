import { PushCampaignEventHandler } from './push-campaign-event.handler';
import { PushNotificationService } from './push-notification.service';

// 群發的送出端（worker）。與其他事件不同的兩件事：
//   ① 送出失敗**不自動重試**（重試＝重複收費 + 家長收到兩則）→ 記下實際結果並標 FAILED。
//   ② 重放的事件**絕不送第二次**（一次重放就是全校再收一則）。

const campaignRow = (over: Record<string, unknown> = {}) => ({
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
  ...over,
});

type UpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type Flex = { altText: string; contents: Record<string, unknown> };

function makePrisma(row: unknown = campaignRow(), users = [{ lineIdentity: { lineUserId: 'L-1' } }]) {
  return {
    pushCampaign: {
      findUnique: jest.fn(async () => row),
      update: jest.fn(async (_args: UpdateArgs) => ({})),
    },
    schoolConfig: { findFirst: jest.fn(async () => ({ brandName: '晴光幼兒園' })) },
    user: { findMany: jest.fn(async () => users) },
  };
}

function makePush(outcome: { sent: number; skipped: number; transientError: unknown }) {
  return {
    sendFlexToLineIds: jest.fn(async (_lineUserIds: string[], _flex: Flex) => outcome),
  };
}

function makeHandler(prisma: ReturnType<typeof makePrisma>, push: ReturnType<typeof makePush>) {
  return new PushCampaignEventHandler(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma as any,
    push as unknown as PushNotificationService,
  );
}

// 最後一次 update 的 data（前面幾次是狀態流轉）。
function lastUpdate(prisma: ReturnType<typeof makePrisma>): Record<string, unknown> {
  const calls = prisma.pushCampaign.update.mock.calls;
  return calls[calls.length - 1]![0]!.data;
}

describe('PushCampaignEventHandler.send', () => {
  it('全部送成功 → 標 SENT，記下送出與略過的則數', async () => {
    const prisma = makePrisma();
    const push = makePush({ sent: 2, skipped: 1, transientError: null });
    await makeHandler(prisma, push).send({ campaignId: 'camp-1' });

    expect(lastUpdate(prisma)).toMatchObject({ status: 'SENT', sentCount: 2, skippedCount: 1 });
    expect(lastUpdate(prisma).failureReason).toBeNull();
  });

  it('先標 SENDING 才開始送（後台看得到正在進行）', async () => {
    const prisma = makePrisma();
    await makeHandler(prisma, makePush({ sent: 1, skipped: 0, transientError: null })).send({
      campaignId: 'camp-1',
    });

    expect(prisma.pushCampaign.update.mock.calls[0]![0].data).toEqual({ status: 'SENDING' });
  });

  it('送出時重新解析收件人（建立與送出之間可能有人剛完成綁定）', async () => {
    const prisma = makePrisma(campaignRow(), [
      { lineIdentity: { lineUserId: 'L-1' } },
      { lineIdentity: { lineUserId: 'L-new' } },
    ]);
    const push = makePush({ sent: 2, skipped: 0, transientError: null });
    await makeHandler(prisma, push).send({ campaignId: 'camp-1' });

    expect(prisma.user.findMany).toHaveBeenCalled();
    expect(push.sendFlexToLineIds.mock.calls[0]![0]).toEqual(['L-1', 'L-new']);
  });

  it('卡片內容帶園名、標題與內文', async () => {
    const prisma = makePrisma();
    const push = makePush({ sent: 1, skipped: 0, transientError: null });
    await makeHandler(prisma, push).send({ campaignId: 'camp-1' });

    const flex = push.sendFlexToLineIds.mock.calls[0]![1];
    expect(flex.altText).toBe('本週五園外教學延期');
    expect(JSON.stringify(flex.contents)).toContain('晴光幼兒園');
  });

  // 群發不自動重試：不丟出（丟出會讓 BullMQ 重送全校），改成把實情寫下來。
  it('部分送不出去 → 標 FAILED + 失敗原因，且不丟出（不重送全校）', async () => {
    const prisma = makePrisma();
    const push = makePush({ sent: 150, skipped: 0, transientError: new Error('LINE 500') });

    await expect(makeHandler(prisma, push).send({ campaignId: 'camp-1' })).resolves.toBeUndefined();

    const data = lastUpdate(prisma);
    expect(data).toMatchObject({ status: 'FAILED', sentCount: 150 });
    expect(String(data.failureReason)).toContain('沒有收到');
  });

  it('事件重放（已 SENT）→ 不再送第二次', async () => {
    const prisma = makePrisma(campaignRow({ status: 'SENT' }));
    const push = makePush({ sent: 0, skipped: 0, transientError: null });
    await makeHandler(prisma, push).send({ campaignId: 'camp-1' });

    expect(push.sendFlexToLineIds).not.toHaveBeenCalled();
    expect(prisma.pushCampaign.update).not.toHaveBeenCalled();
  });

  // 上一輪送到一半進程中斷。停在 SENDING 會讓後台永遠顯示「正在送出」。
  it('重放時發現卡在 SENDING → 標 FAILED 並說明無法確認送出幾則，仍不重送', async () => {
    const prisma = makePrisma(campaignRow({ status: 'SENDING' }));
    const push = makePush({ sent: 0, skipped: 0, transientError: null });
    await makeHandler(prisma, push).send({ campaignId: 'camp-1' });

    expect(push.sendFlexToLineIds).not.toHaveBeenCalled();
    expect(lastUpdate(prisma)).toMatchObject({ status: 'FAILED' });
    expect(String(lastUpdate(prisma).failureReason)).toContain('無法確認');
  });

  it('紀錄不存在 → 直接結束，不卡住 dispatcher', async () => {
    const prisma = makePrisma(null);
    const push = makePush({ sent: 0, skipped: 0, transientError: null });
    await expect(makeHandler(prisma, push).send({ campaignId: 'gone' })).resolves.toBeUndefined();

    expect(push.sendFlexToLineIds).not.toHaveBeenCalled();
  });
});
