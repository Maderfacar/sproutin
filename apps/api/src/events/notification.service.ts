import { Injectable } from '@nestjs/common';
import type { Prisma } from '@sproutin/db';

// 站內 Notification（Derived，docs/02 §3 / docs/06 §4）。
// 本步只寫站內通知列;LINE Push 屬 Step 5（需 Messaging secret）。
// 方法接受 tx，與觸發它的投影/回滾同一交易 —— 事件處理原子（handler idempotent 重放安全）。
@Injectable()
export class NotificationService {
  // 對一批 userId 寫入同型別通知。回傳實際寫入筆數（去重、濾空後）。
  async notify(
    tx: Prisma.TransactionClient,
    userIds: string[],
    type: string,
    payload: Record<string, unknown>,
  ): Promise<number> {
    const targets = [...new Set(userIds)].filter((id) => Boolean(id));
    if (targets.length === 0) {
      return 0;
    }
    await tx.notification.createMany({
      data: targets.map((userId) => ({
        userId,
        type,
        payload: payload as Prisma.InputJsonValue,
      })),
    });
    return targets.length;
  }
}
