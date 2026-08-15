import { Injectable } from '@nestjs/common';
import type {
  LeaveApprovedPayload,
  LeaveCancelledPayload,
  LeaveRejectedPayload,
  LeaveSubmittedPayload,
} from '@sproutin/shared';
import type { Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';
import { RecipientsService } from './recipients.service';
import { NotificationService } from './notification.service';
import { enumerateDays } from './day-key';

// Leave 事件的副作用 handler（docs/06 §2 / ADR-002）。由 Worker 的 Outbox dispatcher 呼叫。
//
// 核心規則（override 感知）：
//   LeaveApproved  → dateFrom..dateTo 逐日 upsert Attendance(status=LEAVE, source=LEAVE_EVENT,
//                    sourceRef/derivedFrom=leaveId)。若當日已 source=MANUAL（老師 override）→ **不覆寫**，
//                    改發 Notification + AuditLog(attendance.override_conflict)。
//   LeaveRejected/
//   LeaveCancelled → 僅刪除仍為 source=LEAVE_EVENT AND sourceRef=thisLeave 的列;
//                    已 override（source=MANUAL AND derivedFrom=thisLeave）→ 不觸碰、發衝突通知。
//   LeaveSubmitted → 通知審核者（老師 + OWNER/ADMIN）。
//
// idempotent（at-least-once dispatch 前提）：投影用 @@unique upsert + source 判斷;回滾以 sourceRef 定位。
// 每個事件處理於單一 $transaction，system actor 寫稽核（actorUserId=null, actorRole='system'）。
@Injectable()
export class LeaveEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: RecipientsService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  // LeaveApproved → 逐日投影 Attendance(source=LEAVE_EVENT)，override 感知。
  async projectApproved(payload: LeaveApprovedPayload): Promise<void> {
    const days = enumerateDays(new Date(payload.dateFrom), new Date(payload.dateTo));

    await this.prisma.$transaction(async (tx) => {
      const conflictDays: string[] = [];
      let projected = 0;

      for (const date of days) {
        const existing = await tx.attendance.findUnique({
          where: { studentId_date: { studentId: payload.studentId, date } },
          select: { id: true, source: true },
        });

        if (!existing) {
          await tx.attendance.create({
            data: {
              studentId: payload.studentId,
              date,
              status: 'LEAVE',
              source: 'LEAVE_EVENT',
              sourceRef: payload.leaveId,
              derivedFrom: payload.leaveId,
            },
          });
          projected += 1;
        } else if (existing.source === 'LEAVE_EVENT') {
          // 再投影（idempotent 重放 / Leave 重新核准）：更新為本 Leave，不新增列。
          await tx.attendance.update({
            where: { id: existing.id },
            data: { status: 'LEAVE', sourceRef: payload.leaveId, derivedFrom: payload.leaveId },
          });
          projected += 1;
        } else {
          // source=MANUAL → 老師已 override，事件不擁有此列（ADR-002 rule 4/5）→ 不覆寫。
          conflictDays.push(date.toISOString());
        }
      }

      if (projected > 0) {
        await this.audit.record(tx, {
          actorUserId: null,
          actorRole: 'system',
          action: 'attendance.project',
          resourceType: 'Leave',
          resourceId: payload.leaveId,
          result: 'SUCCESS',
          metadata: { studentId: payload.studentId, projectedDays: projected },
        });
      }

      if (conflictDays.length > 0) {
        await this.raiseConflict(tx, payload.studentId, payload.leaveId, conflictDays, 'LeaveApproved');
      }

      // 站內通知：家長 + 老師（請假已核准）。
      const r = await this.recipients.forStudent(tx, payload.studentId);
      await this.notifications.notify(tx, [...r.guardians, ...r.teachers], 'LeaveApproved', {
        leaveId: payload.leaveId,
        studentId: payload.studentId,
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
      });
    });
  }

  // LeaveRejected / LeaveCancelled → 回滾（override 感知）。
  async rollback(
    eventType: 'LeaveRejected' | 'LeaveCancelled',
    payload: LeaveRejectedPayload | LeaveCancelledPayload,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 僅還原仍為 LEAVE_EVENT 且 sourceRef=thisLeave 的列（刪除）。
      const derived = await tx.attendance.findMany({
        where: { sourceRef: payload.leaveId, source: 'LEAVE_EVENT' },
        select: { id: true },
      });
      if (derived.length > 0) {
        await tx.attendance.deleteMany({ where: { id: { in: derived.map((d) => d.id) } } });
        await this.audit.record(tx, {
          actorUserId: null,
          actorRole: 'system',
          action: 'attendance.rollback',
          resourceType: 'Leave',
          resourceId: payload.leaveId,
          result: 'SUCCESS',
          metadata: { studentId: payload.studentId, removedDays: derived.length, reason: eventType },
        });
      }

      // 已 override（MANUAL AND derivedFrom=thisLeave）→ 不觸碰，衝突浮現（不靜默覆蓋）。
      const overridden = await tx.attendance.findMany({
        where: { derivedFrom: payload.leaveId, source: 'MANUAL' },
        select: { date: true },
      });
      if (overridden.length > 0) {
        await this.raiseConflict(
          tx,
          payload.studentId,
          payload.leaveId,
          overridden.map((o) => o.date.toISOString()),
          eventType,
        );
      }

      // 站內通知：駁回 → 家長;取消 → 老師 + 行政。
      const r = await this.recipients.forStudent(tx, payload.studentId);
      const targets = eventType === 'LeaveRejected' ? r.guardians : [...r.teachers, ...r.admins];
      await this.notifications.notify(tx, targets, eventType, {
        leaveId: payload.leaveId,
        studentId: payload.studentId,
      });
    });
  }

  // LeaveSubmitted → 通知審核者（老師 + OWNER/ADMIN）。
  async notifySubmitted(payload: LeaveSubmittedPayload): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const r = await this.recipients.forStudent(tx, payload.studentId);
      await this.notifications.notify(tx, [...r.teachers, ...r.admins], 'LeaveSubmitted', {
        leaveId: payload.leaveId,
        studentId: payload.studentId,
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
      });
    });
  }

  // 衝突浮現：AuditLog(attendance.override_conflict) + 通知老師/行政覆核（ADR-002 rule 4/7）。
  private async raiseConflict(
    tx: Prisma.TransactionClient,
    studentId: string,
    leaveId: string,
    days: string[],
    reason: string,
  ): Promise<void> {
    await this.audit.record(tx, {
      actorUserId: null,
      actorRole: 'system',
      action: 'attendance.override_conflict',
      resourceType: 'Leave',
      resourceId: leaveId,
      result: 'SUCCESS',
      metadata: { studentId, days, reason },
    });
    const r = await this.recipients.forStudent(tx, studentId);
    await this.notifications.notify(tx, [...r.teachers, ...r.admins], 'attendance.override_conflict', {
      leaveId,
      studentId,
      days,
      reason,
    });
  }
}
