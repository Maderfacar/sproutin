import { MessageEventHandler } from './message-event.handler';
import { AnnouncementEventHandler } from './announcement-event.handler';
import { RecipientsService } from './recipients.service';
import { NotificationService } from './notification.service';

// MessageSent / AnnouncementPublished → 通知收件人規則。mocked Prisma tx。

function makeTx(opts: {
  guardians?: Array<{ userId: string }>;
  teachers?: Array<{ userId: string }>;
  admins?: Array<{ userId: string }>;
  classGuardians?: Array<{ userId: string }>;
  users?: Array<{ id: string }>;
} = {}) {
  return {
    student: { findUnique: jest.fn(async () => ({ classId: 'class-sun' })) },
    guardianship: {
      findMany: jest.fn(async ({ where }: { where: { studentId?: string; student?: unknown } }) =>
        where.studentId ? opts.guardians ?? [{ userId: 'u-parent' }] : opts.classGuardians ?? [{ userId: 'u-parent' }],
      ),
    },
    teacherAssignment: { findMany: jest.fn(async () => opts.teachers ?? [{ userId: 'u-teacher' }]) },
    userRole: { findMany: jest.fn(async () => opts.admins ?? [{ userId: 'u-owner' }]) },
    user: { findMany: jest.fn(async () => opts.users ?? [{ id: 'u-parent' }, { id: 'u-teacher' }, { id: 'u-owner' }]) },
    notification: {
      createMany: jest.fn(async (_a: { data: Array<{ userId: string }> }) => ({ count: 0 })),
    },
  };
}
type Tx = ReturnType<typeof makeTx>;

function makePrisma(tx: Tx) {
  return { $transaction: jest.fn(async (cb: (t: Tx) => Promise<unknown>) => cb(tx)) };
}

function notifiedUserIds(tx: Tx): string[] {
  const call = tx.notification.createMany.mock.calls[0];
  if (!call) return [];
  return call[0].data.map((d) => d.userId);
}

describe('MessageEventHandler', () => {
  it('通知該生家長+老師，排除發訊者本人', async () => {
    const tx = makeTx({ guardians: [{ userId: 'u-parent' }], teachers: [{ userId: 'u-teacher' }] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new MessageEventHandler(makePrisma(tx) as any, new RecipientsService(), new NotificationService());

    await handler.notify({ messageId: 'm1', studentId: 'stu-sun-1', classId: 'class-sun', senderId: 'u-parent' });

    const ids = notifiedUserIds(tx);
    expect(ids).toContain('u-teacher');
    expect(ids).not.toContain('u-parent'); // 發訊者被排除
  });
});

describe('AnnouncementEventHandler', () => {
  it('全校公告（classId=null）→ 通知所有使用者', async () => {
    const tx = makeTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new AnnouncementEventHandler(makePrisma(tx) as any, new RecipientsService(), new NotificationService());

    await handler.notify({ announcementId: 'a1', schoolId: 's1', classId: null });

    expect(tx.user.findMany).toHaveBeenCalled();
    expect(notifiedUserIds(tx).sort()).toEqual(['u-owner', 'u-parent', 'u-teacher']);
  });

  it('班級公告 → 通知該班老師 + 該班學生家長', async () => {
    const tx = makeTx({ teachers: [{ userId: 'u-teacher' }], classGuardians: [{ userId: 'u-parent' }] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new AnnouncementEventHandler(makePrisma(tx) as any, new RecipientsService(), new NotificationService());

    await handler.notify({ announcementId: 'a1', schoolId: 's1', classId: 'class-sun' });

    expect(tx.user.findMany).not.toHaveBeenCalled(); // 非全校 → 不撈所有使用者
    const ids = notifiedUserIds(tx);
    expect(ids).toEqual(expect.arrayContaining(['u-teacher', 'u-parent']));
  });
});
