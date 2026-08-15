import { Injectable } from '@nestjs/common';
import type { AnnouncementPublishedPayload } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { RecipientsService } from './recipients.service';
import { NotificationService } from './notification.service';

// AnnouncementPublished → 站內通知（docs/06 §4）。
//   scope=SCHOOL（classId=null）→ 全校所有使用者。
//   scope=CLASS（classId 有值）→ 該班老師 + 該班學生的監護人。
// LINE Push 屬 Step 5。
@Injectable()
export class AnnouncementEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: RecipientsService,
    private readonly notifications: NotificationService,
  ) {}

  async notify(payload: AnnouncementPublishedPayload): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const targets = payload.classId
        ? await this.recipients.forClass(tx, payload.classId)
        : await this.recipients.allUsers(tx);
      await this.notifications.notify(tx, targets, 'AnnouncementPublished', {
        announcementId: payload.announcementId,
        schoolId: payload.schoolId,
        classId: payload.classId,
      });
    });
  }
}
