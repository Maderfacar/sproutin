import { PushNotificationService } from './push-notification.service';
import { LinePushError } from './line-push.client';
import { RecipientsService } from './recipients.service';

// LINE 推播：只推重點事件、收件人對映 lineUserId、排除發訊者、未綁 LINE 略過。mocked Prisma + client。

type PrismaMock = {
  lineIdentity: { findMany: jest.Mock };
  student: { findUnique: jest.Mock };
  announcement: { findUnique: jest.Mock };
};
type ClientMock = { push: jest.Mock };
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
  };
}

function makeService(prisma: PrismaMock, recipients: RecipientsMock, client: ClientMock): PushNotificationService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PushNotificationService(prisma as any, recipients as any as RecipientsService, client as any);
}

function pushedTo(client: ClientMock): string[] {
  return client.push.mock.calls.map((c) => c[0] as string);
}

function pushedText(client: ClientMock): string[] {
  return client.push.mock.calls.map((c) => c[1] as string);
}

describe('PushNotificationService.push', () => {
  it('LeaveApproved → 只推家長（對映 lineUserId）', async () => {
    const prisma = makePrisma();
    const recipients = { forStudent: jest.fn(async () => ({ guardians: ['u-parent'], teachers: ['u-teacher'], admins: [] })) };
    const client = { push: jest.fn(async (_to: string, _text: string) => undefined) };
    await makeService(prisma, recipients, client).push('LeaveApproved', { leaveId: 'l1', studentId: 'stu-1', dateFrom: '', dateTo: '' });

    expect(pushedTo(client)).toEqual(['L-u-parent']); // 只有家長、老師不推
    expect(client.push.mock.calls[0]![1]).toContain('核准');
    expect(client.push.mock.calls[0]![1]).toContain('范小星'); // 帶學生姓名
  });

  it('MessageSent → 推家長+老師，排除發訊者本人', async () => {
    const prisma = makePrisma();
    const recipients = { forStudent: jest.fn(async () => ({ guardians: ['u-parent'], teachers: ['u-teacher'], admins: [] })) };
    const client = { push: jest.fn(async (_to: string, _text: string) => undefined) };
    await makeService(prisma, recipients, client).push('MessageSent', {
      messageId: 'm1',
      studentId: 'stu-1',
      classId: 'c1',
      senderId: 'u-parent', // 發訊者
    });

    expect(pushedTo(client)).toEqual(['L-u-teacher']); // 發訊者 u-parent 被排除
  });

  // 階段2 刀5：公告改為會推播（Human Owner 2026-08-17 同意納入）。
  it('全校公告 → 推給全體，文字帶公告標題', async () => {
    const prisma = makePrisma();
    const recipients = {
      forStudent: jest.fn(),
      allUsers: jest.fn(async () => ['u-parent', 'u-teacher']),
      forClass: jest.fn(),
    };
    const client = { push: jest.fn(async (_to: string, _text: string) => undefined) };
    await makeService(prisma, recipients, client).push('AnnouncementPublished', {
      announcementId: 'a1',
      schoolId: 's1',
      classId: null,
    });

    expect(pushedTo(client).sort()).toEqual(['L-u-parent', 'L-u-teacher']);
    expect(pushedText(client)[0]).toBe('【全校公告】本週五校外教學');
    expect(recipients.forClass).not.toHaveBeenCalled();
  });

  it('班級公告 → 只推該班（該班老師 + 該班家長）', async () => {
    const prisma = makePrisma();
    const recipients = {
      forStudent: jest.fn(),
      allUsers: jest.fn(),
      forClass: jest.fn(async () => ['u-parent']),
    };
    const client = { push: jest.fn(async (_to: string, _text: string) => undefined) };
    await makeService(prisma, recipients, client).push('AnnouncementPublished', {
      announcementId: 'a1',
      schoolId: 's1',
      classId: 'class-sun',
    });

    expect(pushedTo(client)).toEqual(['L-u-parent']);
    expect(pushedText(client)[0]).toBe('【班級公告】本週五校外教學');
    expect(recipients.allUsers).not.toHaveBeenCalled();
  });

  it('公告已被刪除（查無標題）→ 不推空洞訊息', async () => {
    const prisma = makePrisma();
    prisma.announcement.findUnique.mockResolvedValue(null);
    const recipients = { forStudent: jest.fn(), allUsers: jest.fn(), forClass: jest.fn() };
    const client = { push: jest.fn(async (_to: string, _text: string) => undefined) };
    await makeService(prisma, recipients, client).push('AnnouncementPublished', {
      announcementId: 'gone',
      schoolId: 's1',
      classId: null,
    });

    expect(client.push).not.toHaveBeenCalled();
    expect(recipients.allUsers).not.toHaveBeenCalled();
  });

  it('其餘非重點事件（AttendanceMarked）→ 不推', async () => {
    const prisma = makePrisma();
    const recipients = { forStudent: jest.fn() };
    const client = { push: jest.fn(async (_to: string, _text: string) => undefined) };
    await makeService(prisma, recipients, client).push('AttendanceMarked', { studentId: 'stu-1' });

    expect(client.push).not.toHaveBeenCalled();
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
    const client = {
      push: jest.fn(async (to: string) => {
        if (to === 'L-u-fake') {
          throw new LinePushError(400, `{"message":"The property, 'to', in the request body is invalid"}`);
        }
      }),
    };

    await makeService(prisma, recipients, client).push('AnnouncementPublished', {
      announcementId: 'a1',
      schoolId: 's1',
      classId: null,
    });

    expect(pushedTo(client)).toEqual(['L-u-fake', 'L-u-real']); // 兩個都試過
    // 未丟出 → BullMQ 不會重試（永久性錯誤重試也不會成功）
  });

  it('暫時性失敗（500）→ 其他人照送，最後仍丟出讓 BullMQ 重試', async () => {
    const prisma = makePrisma();
    const recipients = {
      forStudent: jest.fn(),
      allUsers: jest.fn(async () => ['u-down', 'u-real']),
      forClass: jest.fn(),
    };
    const client = {
      push: jest.fn(async (to: string) => {
        if (to === 'L-u-down') {
          throw new LinePushError(500, 'internal');
        }
      }),
    };

    await expect(
      makeService(prisma, recipients, client).push('AnnouncementPublished', {
        announcementId: 'a1',
        schoolId: 's1',
        classId: null,
      }),
    ).rejects.toBeInstanceOf(LinePushError);

    expect(pushedTo(client)).toEqual(['L-u-down', 'L-u-real']); // 沒有因為一個掛掉就跳過其他人
  });

  it('收件人未綁 LINE（無 LineIdentity）→ 不推', async () => {
    const prisma = makePrisma();
    prisma.lineIdentity.findMany.mockResolvedValue([]); // 查無對映
    const recipients = { forStudent: jest.fn(async () => ({ guardians: ['u-parent'], teachers: [], admins: [] })) };
    const client = { push: jest.fn(async (_to: string, _text: string) => undefined) };
    await makeService(prisma, recipients, client).push('LeaveRejected', { leaveId: 'l1', studentId: 'stu-1' });

    expect(client.push).not.toHaveBeenCalled();
  });
});
