import { Injectable } from '@nestjs/common';
import type { MessageSentPayload } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { RecipientsService } from './recipients.service';
import { NotificationService } from './notification.service';

// MessageSent → 站內通知（docs/06 §4）。以 Student 為核心：通知該生的家長 + 老師，
// 但**排除發訊者本人**（自己發的不需通知自己）。LINE Push 屬 Step 5。
@Injectable()
export class MessageEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: RecipientsService,
    private readonly notifications: NotificationService,
  ) {}

  async notify(payload: MessageSentPayload): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const r = await this.recipients.forStudent(tx, payload.studentId);
      const targets = [...r.guardians, ...r.teachers].filter((id) => id !== payload.senderId);
      await this.notifications.notify(tx, targets, 'MessageSent', {
        messageId: payload.messageId,
        studentId: payload.studentId,
        classId: payload.classId,
        senderId: payload.senderId,
      });
    });
  }
}
