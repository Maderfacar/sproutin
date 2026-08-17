import { PushNotificationService } from './push-notification.service';
import { LinePushError } from './line-push.client';
import { RecipientsService } from './recipients.service';

// LINE 推播：只推重點事件、收件人對映 lineUserId、排除發訊者、未綁 LINE 略過。mocked Prisma + client。
// 公告推播自 2026-08-17 起送 Flex 卡片（pushFlex）而非純文字（Human Owner 拍板）。

type PrismaMock = {
  lineIdentity: { findMany: jest.Mock };
  student: { findUnique: jest.Mock };
  announcement: { findUnique: jest.Mock };
  schoolConfig: { findFirst: jest.Mock };
};
type ClientMock = { push: jest.Mock; pushFlex: jest.Mock };
type RecipientsMock = { forStudent: jest.Mock; forClass?: jest.Mock; allUsers?: jest.Mock };

function makePrisma(): PrismaMock {
  return {
    lineIdentity: {
      findMany: jest.fn(async ({ where }: { where: { userId: { in: string[] } } }) =>
        where.userId.in.map((userId) => ({ lineUserId: `L-${userId}` })),
      ),
    },
    student: { findUnique: jest.fn(async () => ({ name: '范小星' })) },
    announcement: { findUnique: jest.fn(async () => ({ title: '本週五校外教學' })) },
    schoolConfig: { findFirst: jest.fn(async () => ({ brandName: '晴光幼兒園', liffId: 'liff-1' })) },
  };
}

function makeClient(onSend?: (to: string) => void): ClientMock {
  const send = async (to: string) => {
    onSend?.(to);
  };
  return { push: jest.fn(send), pushFlex: jest.fn(send) };
}

function makeService(prisma: PrismaMock, recipients: RecipientsMock, client: ClientMock): PushNotificationService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PushNotificationService(prisma as any, recipients as any as RecipientsService, client as any);
}

function pushedTo(client: ClientMock): string[] {
  return client.push.mock.calls.map((c) => c[0] as string);
}

function flexTo(client: ClientMock): string[] {
  return client.pushFlex.mock.calls.map((c) => c[0] as string);
}

function flexAltText(client: ClientMock): string[] {
  return client.pushFlex.mock.calls.map((c) => c[1] as string);
}

function flexContents(client: ClientMock): Record<string, unknown> {
  return client.pushFlex.mock.calls[0]![2] as Record<string, unknown>;
}

describe('PushNotificationService.push', () => {
  it('LeaveApproved → 只推家長（對映 lineUserId）', async () => {
    const prisma = makePrisma();
    const recipients = { forStudent: jest.fn(async () => ({ guardians: ['u-parent'], teachers: ['u-teacher'], admins: [] })) };
    const client = makeClient();
    await makeService(prisma, recipients, client).push('LeaveApproved', { leaveId: 'l1', studentId: 'stu-1', dateFrom: '', dateTo: '' });

    expect(pushedTo(client)).toEqual(['L-u-parent']); // 只有家長、老師不推
    expect(client.push.mock.calls[0]![1]).toContain('核准');
    expect(client.push.mock.calls[0]![1]).toContain('范小星'); // 帶學生姓名
  });

  it('MessageSent → 推家長+老師，排除發訊者本人', async () => {
    const prisma = makePrisma();
    const recipients = { forStudent: jest.fn(async () => ({ guardians: ['u-parent'], teachers: ['u-teacher'], admins: [] })) };
    const client = makeClient();
    await makeService(prisma, recipients, client).push('MessageSent', {
      messageId: 'm1',
      studentId: 'stu-1',
      classId: 'c1',
      senderId: 'u-parent', // 發訊者
    });

    expect(pushedTo(client)).toEqual(['L-u-teacher']); // 發訊者 u-parent 被排除
  });

  // 階段2 刀5：公告改為會推播（Human Owner 2026-08-17 同意納入）。
  // 階段3：改送 Flex 卡片 —— altText 仍是升級前那句，通知列上看到的內容不因改版而變差。
  it('全校公告 → 推給全體，卡片帶園名、標題與查看公告按鈕', async () => {
    const prisma = makePrisma();
    const recipients = {
      forStudent: jest.fn(),
      allUsers: jest.fn(async () => ['u-parent', 'u-teacher']),
      forClass: jest.fn(),
    };
    const client = makeClient();
    await makeService(prisma, recipients, client).push('AnnouncementPublished', {
      announcementId: 'a1',
      schoolId: 's1',
      classId: null,
    });

    expect(flexTo(client).sort()).toEqual(['L-u-parent', 'L-u-teacher']);
    expect(flexAltText(client)[0]).toBe('【全校公告】本週五校外教學');
    expect(client.push).not.toHaveBeenCalled(); // 不再送純文字
    const json = JSON.stringify(flexContents(client));
    expect(json).toContain('晴光幼兒園');
    expect(json).toContain('本週五校外教學');
    expect(json).toContain('https://liff.line.me/liff-1/announcement');
    expect(json).not.toContain('本文'); // 內文不進卡片（公告可能很長）
    expect(recipients.forClass).not.toHaveBeenCalled();
  });

  it('班級公告 → 只推該班（該班老師 + 該班家長）', async () => {
    const prisma = makePrisma();
    const recipients = {
      forStudent: jest.fn(),
      allUsers: jest.fn(),
      forClass: jest.fn(async () => ['u-parent']),
    };
    const client = makeClient();
    await makeService(prisma, recipients, client).push('AnnouncementPublished', {
      announcementId: 'a1',
      schoolId: 's1',
      classId: 'class-sun',
    });

    expect(flexTo(client)).toEqual(['L-u-parent']);
    expect(flexAltText(client)[0]).toBe('【班級公告】本週五校外教學');
    expect(recipients.allUsers).not.toHaveBeenCalled();
  });

  // liffId 沒設定時放一顆點了會開到錯地方的按鈕，比沒有按鈕更糟。
  it('園所尚未設定 liffId → 卡片不放按鈕，但照樣推出去', async () => {
    const prisma = makePrisma();
    prisma.schoolConfig.findFirst.mockResolvedValue({ brandName: '晴光幼兒園', liffId: null });
    const recipients = {
      forStudent: jest.fn(),
      allUsers: jest.fn(async () => ['u-parent']),
      forClass: jest.fn(),
    };
    const client = makeClient();
    await makeService(prisma, recipients, client).push('AnnouncementPublished', {
      announcementId: 'a1',
      schoolId: 's1',
      classId: null,
    });

    expect(flexTo(client)).toEqual(['L-u-parent']);
    expect(flexContents(client).footer).toBeUndefined();
  });

  it('公告已被刪除（查無標題）→ 不推空洞訊息', async () => {
    const prisma = makePrisma();
    prisma.announcement.findUnique.mockResolvedValue(null);
    const recipients = { forStudent: jest.fn(), allUsers: jest.fn(), forClass: jest.fn() };
    const client = makeClient();
    await makeService(prisma, recipients, client).push('AnnouncementPublished', {
      announcementId: 'gone',
      schoolId: 's1',
      classId: null,
    });

    expect(client.pushFlex).not.toHaveBeenCalled();
    expect(recipients.allUsers).not.toHaveBeenCalled();
  });

  it('其餘非重點事件（AttendanceMarked）→ 不推', async () => {
    const prisma = makePrisma();
    const recipients = { forStudent: jest.fn() };
    const client = makeClient();
    await makeService(prisma, recipients, client).push('AttendanceMarked', { studentId: 'stu-1' });

    expect(client.push).not.toHaveBeenCalled();
    expect(client.pushFlex).not.toHaveBeenCalled();
    expect(recipients.forStudent).not.toHaveBeenCalled();
  });

  // 2026-08-17 線上教訓：demo 種子帶假 LINE ID → LINE 回 400，原本整批中斷，
  // 排在後面的真實收件人永遠收不到（且每次重試都卡在同一處）。
  it('某收件人被 LINE 拒絕（400 無效 ID）→ 略過他，其他人照樣送達', async () => {
    const prisma = makePrisma();
    const recipients = {
      forStudent: jest.fn(),
      allUsers: jest.fn(async () => ['u-fake', 'u-real']),
      forClass: jest.fn(),
    };
    const client = makeClient((to) => {
      if (to === 'L-u-fake') {
        throw new LinePushError(400, `{"message":"The property, 'to', in the request body is invalid"}`);
      }
    });

    await makeService(prisma, recipients, client).push('AnnouncementPublished', {
      announcementId: 'a1',
      schoolId: 's1',
      classId: null,
    });

    expect(flexTo(client)).toEqual(['L-u-fake', 'L-u-real']); // 兩個都試過
    // 未丟出 → BullMQ 不會重試（永久性錯誤重試也不會成功）
  });

  it('暫時性失敗（500）→ 其他人照送，最後仍丟出讓 BullMQ 重試', async () => {
    const prisma = makePrisma();
    const recipients = {
      forStudent: jest.fn(),
      allUsers: jest.fn(async () => ['u-down', 'u-real']),
      forClass: jest.fn(),
    };
    const client = makeClient((to) => {
      if (to === 'L-u-down') {
        throw new LinePushError(500, 'internal');
      }
    });

    await expect(
      makeService(prisma, recipients, client).push('AnnouncementPublished', {
        announcementId: 'a1',
        schoolId: 's1',
        classId: null,
      }),
    ).rejects.toBeInstanceOf(LinePushError);

    expect(flexTo(client)).toEqual(['L-u-down', 'L-u-real']); // 沒有因為一個掛掉就跳過其他人
  });

  it('收件人未綁 LINE（無 LineIdentity）→ 不推', async () => {
    const prisma = makePrisma();
    prisma.lineIdentity.findMany.mockResolvedValue([]); // 查無對映
    const recipients = { forStudent: jest.fn(async () => ({ guardians: ['u-parent'], teachers: [], admins: [] })) };
    const client = makeClient();
    await makeService(prisma, recipients, client).push('LeaveRejected', { leaveId: 'l1', studentId: 'stu-1' });

    expect(client.push).not.toHaveBeenCalled();
  });

  // 群發用的入口：**回傳結果而不丟出**，讓呼叫端自己決定要不要重試
  // （群發自動重試＝重複收費 + 家長收到兩則）。
  describe('sendFlexToLineIds（群發）', () => {
    it('回報送出與略過的人數，且不丟出', async () => {
      const prisma = makePrisma();
      const client = makeClient((to) => {
        if (to === 'L-bad') {
          throw new LinePushError(400, 'invalid');
        }
      });
      const outcome = await makeService(prisma, { forStudent: jest.fn() }, client).sendFlexToLineIds(
        ['L-ok', 'L-bad', 'L-ok2'],
        { altText: 'alt', contents: { type: 'bubble' } },
      );

      expect(outcome).toEqual({ sent: 2, skipped: 1, transientError: null });
      expect(flexTo(client)).toEqual(['L-ok', 'L-bad', 'L-ok2']);
    });

    it('暫時性失敗 → 其他人照送完，把錯誤回報給呼叫端（不自行丟出）', async () => {
      const prisma = makePrisma();
      const client = makeClient((to) => {
        if (to === 'L-down') {
          throw new LinePushError(503, 'unavailable');
        }
      });
      const outcome = await makeService(prisma, { forStudent: jest.fn() }, client).sendFlexToLineIds(
        ['L-down', 'L-ok'],
        { altText: 'alt', contents: { type: 'bubble' } },
      );

      expect(outcome.sent).toBe(1);
      expect(outcome.transientError).toBeInstanceOf(LinePushError);
      expect(flexTo(client)).toEqual(['L-down', 'L-ok']);
    });
  });
});
