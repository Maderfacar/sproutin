import { Injectable } from '@nestjs/common';
import type {
  LeaveApprovedPayload,
  LeaveCancelledPayload,
  LeaveRejectedPayload,
  LeaveSubmittedPayload,
} from '@sproutin/shared';
import { LeaveEventHandler } from './leave-event.handler';

// Outbox 事件路由（docs/06 §4 訂閱表）。dispatcher 對每個 claim 到的事件呼叫 handle()。
// 未來新事件（MessageSent / AnnouncementPublished…）在此加 case，不改既有 domain 模組（docs/06 §6）。
@Injectable()
export class EventHandlersService {
  constructor(private readonly leave: LeaveEventHandler) {}

  async handle(eventType: string, payload: unknown): Promise<void> {
    switch (eventType) {
      case 'LeaveSubmitted':
        return this.leave.notifySubmitted(payload as LeaveSubmittedPayload);
      case 'LeaveApproved':
        return this.leave.projectApproved(payload as LeaveApprovedPayload);
      case 'LeaveRejected':
        return this.leave.rollback('LeaveRejected', payload as LeaveRejectedPayload);
      case 'LeaveCancelled':
        return this.leave.rollback('LeaveCancelled', payload as LeaveCancelledPayload);
      case 'AttendanceMarked':
        // MVP：AttendanceMarked 通知為選配（docs/06 §4），本步不發 → no-op。
        return;
      default:
        // 未知事件型別 → 忽略（標為已派發，不阻塞 dispatcher）。
        return;
    }
  }
}
