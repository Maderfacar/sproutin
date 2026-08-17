import { Injectable } from '@nestjs/common';
import type { LeaveApprovedPayload, LeaveCancelledPayload, LeaveRejectedPayload } from '@sproutin/shared';
import type { BusDirection } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';
import { enumerateDays } from './day-key';

// 請假 → 自動移出乘車名單（docs/06 §4 的 Transportation 訂閱點，架構早就留好的位置）。
//
// **這是「訂閱既有事件」，不是修改請假模組**：leaves/ 底下一行都沒動。
// 娃娃車要不要接、什麼時候接，完全是這個 handler 自己的事。
//
// 語意與 Attendance 的投影（ADR-002）刻意一致，因為問題是同一個：
//   LeaveApproved  → 逐日、逐方向 upsert BusRide(status=ABSENT, source=LEAVE_EVENT, sourceRef=leaveId)。
//                    若當日該方向已有老師手動記錄（source=MANUAL）→ **不覆寫**。
//                    孩子明明已經上車了，事件卻把他標成沒搭，那是把事實蓋掉。
//   LeaveRejected /
//   LeaveCancelled → 只刪除仍為 source=LEAVE_EVENT 且 sourceRef=thisLeave 的列，
//                    孩子精準回到名單上；老師手動記過的不觸碰。
//
// idempotent（at-least-once dispatch 前提）：@@unique upsert + source 判斷；回滾以 sourceRef 定位。
const DIRECTIONS: readonly BusDirection[] = ['MORNING', 'AFTERNOON'];

@Injectable()
export class BusEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onLeaveApproved(payload: LeaveApprovedPayload): Promise<void> {
    const assignment = await this.prisma.busAssignment.findUnique({
      where: { studentId: payload.studentId },
      select: { routeId: true, ridesMorning: true, ridesAfternoon: true },
    });
    // 沒搭娃娃車的孩子（絕大多數情況）→ 這個事件與他無關，直接結束。
    if (!assignment) return;

    const days = enumerateDays(new Date(payload.dateFrom), new Date(payload.dateTo));

    await this.prisma.$transaction(async (tx) => {
      let removed = 0;
      let skipped = 0;

      for (const date of days) {
        for (const direction of DIRECTIONS) {
          if (direction === 'MORNING' && !assignment.ridesMorning) continue;
          if (direction === 'AFTERNOON' && !assignment.ridesAfternoon) continue;

          const existing = await tx.busRide.findUnique({
            where: {
              studentId_date_direction: { studentId: payload.studentId, date, direction },
            },
            select: { id: true, source: true },
          });

          if (existing && existing.source === 'MANUAL') {
            // 老師已經記過這一趟（可能孩子早上還是上了車）→ 事件不擁有這一列。
            skipped += 1;
            continue;
          }

          await tx.busRide.upsert({
            where: {
              studentId_date_direction: { studentId: payload.studentId, date, direction },
            },
            create: {
              studentId: payload.studentId,
              date,
              direction,
              routeId: assignment.routeId,
              status: 'ABSENT',
              source: 'LEAVE_EVENT',
              sourceRef: payload.leaveId,
            },
            update: { status: 'ABSENT', source: 'LEAVE_EVENT', sourceRef: payload.leaveId },
          });
          removed += 1;
        }
      }

      if (removed > 0 || skipped > 0) {
        await this.audit.record(tx, {
          actorUserId: null,
          actorRole: 'system',
          action: 'bus.roster.leave_removed',
          resourceType: 'Leave',
          resourceId: payload.leaveId,
          result: 'SUCCESS',
          metadata: { studentId: payload.studentId, removed, skipped },
        });
      }
    });
  }

  async onLeaveClosed(
    eventType: 'LeaveRejected' | 'LeaveCancelled',
    payload: LeaveRejectedPayload | LeaveCancelledPayload,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const derived = await tx.busRide.findMany({
        where: { sourceRef: payload.leaveId, source: 'LEAVE_EVENT' },
        select: { id: true },
      });
      if (derived.length === 0) return;

      await tx.busRide.deleteMany({ where: { id: { in: derived.map((d) => d.id) } } });
      await this.audit.record(tx, {
        actorUserId: null,
        actorRole: 'system',
        action: 'bus.roster.leave_restored',
        resourceType: 'Leave',
        resourceId: payload.leaveId,
        result: 'SUCCESS',
        metadata: { studentId: payload.studentId, restored: derived.length, reason: eventType },
      });
    });
  }
}
