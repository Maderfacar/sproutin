import { PushNotificationService } from './push-notification.service';
import { RecipientsService } from './recipients.service';

// LINE 推播：只推重點事件、收件人對映 lineUserId、排除發訊者、未綁 LINE 略過。mocked Prisma + client。

type PrismaMock = {
  lineIdentity: { findMany: jest.Mock };
};
type ClientMock = { push: jest.Mock };
type RecipientsMock = { forStudent: jest.Mock };

function makePrisma(): PrismaMock {
  return {
    lineIdentity: {
      findMany: jest.fn(async ({ where }: { where: { userId: { in: string[] } } }) =>
        where.userId.in.map((userId) => ({ lineUserId: `L-${userId}` })),
      ),
    },
  };
}

function makeService(prisma: PrismaMock, recipients: RecipientsMock, client: ClientMock): PushNotificationService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PushNotificationService(prisma as any, recipients as any as RecipientsService, client as any);
}

function pushedTo(client: ClientMock): string[] {
  return client.push.mock.calls.map((c) => c[0] as string);
}

describe('PushNotificationService.push', () => {
  it('LeaveApproved → 只推家長（對映 lineUserId）', async () => {
    const prisma = makePrisma();
    const recipients = { forStudent: jest.fn(async () => ({ guardians: ['u-parent'], teachers: ['u-teacher'], admins: [] })) };
    const client = { push: jest.fn(async (_to: string, _text: string) => undefined) };
    await makeService(prisma, recipients, client).push('LeaveApproved', { leaveId: 'l1', studentId: 'stu-1', dateFrom: '', dateTo: '' });

    expect(pushedTo(client)).toEqual(['L-u-parent']); // 只有家長、老師不推
    expect(client.push.mock.calls[0]![1]).toContain('核准');
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

  it('非重點事件（AnnouncementPublished）→ 不推', async () => {
    const prisma = makePrisma();
    const recipients = { forStudent: jest.fn() };
    const client = { push: jest.fn(async (_to: string, _text: string) => undefined) };
    await makeService(prisma, recipients, client).push('AnnouncementPublished', { announcementId: 'a1', schoolId: 's1', classId: null });

    expect(client.push).not.toHaveBeenCalled();
    expect(recipients.forStudent).not.toHaveBeenCalled();
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
