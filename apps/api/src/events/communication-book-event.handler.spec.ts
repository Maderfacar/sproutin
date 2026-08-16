import { CommunicationBookEventHandler } from './communication-book-event.handler';
import { RecipientsService } from './recipients.service';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';

// CommunicationBookPublished：站內通知給每位學生的監護人；
// LINE 推播**只給老師勾選的學生**（日常記錄全班推播會讓訊息量與費用失控）。

function makeTx(guardianships: Array<{ studentId: string; userId: string }>) {
  return {
    guardianship: { findMany: jest.fn(async () => guardianships) },
    notification: {
      createMany: jest.fn(async (_a: { data: Array<{ userId: string }> }) => ({ count: 0 })),
    },
  };
}
type Tx = ReturnType<typeof makeTx>;

function makePrisma(tx: Tx) {
  return { $transaction: jest.fn(async (cb: (t: Tx) => Promise<unknown>) => cb(tx)) };
}

describe('CommunicationBookEventHandler', () => {
  it('每位送出的學生 → 通知其監護人', async () => {
    const tx = makeTx([
      { studentId: 'stu-1', userId: 'u-parent-1' },
      { studentId: 'stu-2', userId: 'u-parent-2' },
    ]);
    const handler = new CommunicationBookEventHandler(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makePrisma(tx) as any,
      new RecipientsService(),
      new NotificationService(),
    );

    await handler.notify({
      classId: 'class-sun',
      date: '2026-08-17T00:00:00.000Z',
      studentIds: ['stu-1', 'stu-2'],
      pushStudentIds: [],
    });

    const notified = tx.notification.createMany.mock.calls.flatMap((c) => c[0].data.map((d) => d.userId));
    expect(notified.sort()).toEqual(['u-parent-1', 'u-parent-2']);
  });

  it('沒有監護人的學生 → 不寫通知（不產生無主通知列）', async () => {
    const tx = makeTx([]);
    const handler = new CommunicationBookEventHandler(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makePrisma(tx) as any,
      new RecipientsService(),
      new NotificationService(),
    );

    await handler.notify({
      classId: 'class-sun',
      date: '2026-08-17T00:00:00.000Z',
      studentIds: ['stu-1'],
      pushStudentIds: [],
    });

    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
});

describe('PushNotificationService — CommunicationBookPublished', () => {
  function makePushService(pushed: string[]) {
    const prisma = {
      student: { findUnique: jest.fn(async () => ({ name: '小恩' })) },
      guardianship: { findMany: jest.fn(async () => [{ userId: 'u-parent-1' }]) },
      teacherAssignment: { findMany: jest.fn(async () => []) },
      userRole: { findMany: jest.fn(async () => []) },
      lineIdentity: { findMany: jest.fn(async () => [{ lineUserId: 'Uline1' }]) },
    };
    const client = { push: jest.fn(async (to: string, text: string) => void pushed.push(`${to}|${text}`)) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PushNotificationService(prisma as any, new RecipientsService(), client as any);
  }

  it('pushStudentIds 為空 → 完全不推 LINE（只留站內通知）', async () => {
    const pushed: string[] = [];
    const service = makePushService(pushed);

    await service.push('CommunicationBookPublished', {
      classId: 'class-sun',
      date: '2026-08-17T00:00:00.000Z',
      studentIds: ['stu-1', 'stu-2'],
      pushStudentIds: [],
    });

    expect(pushed).toHaveLength(0);
  });

  it('只推老師勾選的學生，且訊息帶學生姓名', async () => {
    const pushed: string[] = [];
    const service = makePushService(pushed);

    await service.push('CommunicationBookPublished', {
      classId: 'class-sun',
      date: '2026-08-17T00:00:00.000Z',
      studentIds: ['stu-1', 'stu-2'],
      pushStudentIds: ['stu-2'],
    });

    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toContain('小恩');
  });
});
