import { Injectable } from '@nestjs/common';
import type { CommunicationBookPublishedPayload } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { RecipientsService } from './recipients.service';
import { NotificationService } from './notification.service';

// CommunicationBookPublished → 站內通知（docs/06 §4）。
// 對象＝本次送出的每位學生的監護人（老師自己不需要被通知自己填的紀錄）。
// LINE 推播另由 PushNotificationService 處理，且**只推 pushStudentIds**（見該檔說明）。
@Injectable()
export class CommunicationBookEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: RecipientsService,
    private readonly notifications: NotificationService,
  ) {}

  async notify(payload: CommunicationBookPublishedPayload): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const byStudent = await this.recipients.guardiansByStudent(tx, payload.studentIds);
      for (const studentId of payload.studentIds) {
        const guardians = byStudent.get(studentId) ?? [];
        await this.notifications.notify(tx, guardians, 'CommunicationBookPublished', {
          studentId,
          classId: payload.classId,
          date: payload.date,
        });
      }
    });
  }
}
