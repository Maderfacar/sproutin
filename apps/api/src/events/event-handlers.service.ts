import { Injectable } from '@nestjs/common';
import type {
  AnnouncementPublishedPayload,
  CommunicationBookPublishedPayload,
  LeaveApprovedPayload,
  LeaveCancelledPayload,
  LeaveRejectedPayload,
  LeaveSubmittedPayload,
  MessageSentPayload,
  PushCampaignQueuedPayload,
} from '@sproutin/shared';
import { LeaveEventHandler } from './leave-event.handler';
import { MessageEventHandler } from './message-event.handler';
import { AnnouncementEventHandler } from './announcement-event.handler';
import { CommunicationBookEventHandler } from './communication-book-event.handler';
import { PushCampaignEventHandler } from './push-campaign-event.handler';
import { BusEventHandler } from './bus-event.handler';

// Outbox 事件路由（docs/06 §4 訂閱表）。dispatcher 對每個 claim 到的事件呼叫 handle()。
// 新事件在此加 case、以獨立 handler 訂閱，不改既有 domain 模組（docs/06 §6）。
@Injectable()
export class EventHandlersService {
  constructor(
    private readonly leave: LeaveEventHandler,
    private readonly message: MessageEventHandler,
    private readonly announcement: AnnouncementEventHandler,
    private readonly book: CommunicationBookEventHandler,
    private readonly campaign: PushCampaignEventHandler,
    private readonly bus: BusEventHandler,
  ) {}

  async handle(eventType: string, payload: unknown): Promise<void> {
    switch (eventType) {
      case 'LeaveSubmitted':
        return this.leave.notifySubmitted(payload as LeaveSubmittedPayload);
      // Leave 的三個結束態各有兩個訂閱者：出缺勤投影（既有）與乘車名單（Phase 9 ⑦）。
      // 兩者互不相識，只是訂閱同一個事件 —— 這正是 docs/06 §6 說的擴充方式。
      case 'LeaveApproved':
        await this.leave.projectApproved(payload as LeaveApprovedPayload);
        return this.bus.onLeaveApproved(payload as LeaveApprovedPayload);
      case 'LeaveRejected':
        await this.leave.rollback('LeaveRejected', payload as LeaveRejectedPayload);
        return this.bus.onLeaveClosed('LeaveRejected', payload as LeaveRejectedPayload);
      case 'LeaveCancelled':
        await this.leave.rollback('LeaveCancelled', payload as LeaveCancelledPayload);
        return this.bus.onLeaveClosed('LeaveCancelled', payload as LeaveCancelledPayload);
      case 'MessageSent':
        return this.message.notify(payload as MessageSentPayload);
      case 'AnnouncementPublished':
        return this.announcement.notify(payload as AnnouncementPublishedPayload);
      case 'CommunicationBookPublished':
        return this.book.notify(payload as CommunicationBookPublishedPayload);
      case 'PushCampaignQueued':
        return this.campaign.send(payload as PushCampaignQueuedPayload);
      case 'AttendanceMarked':
        // MVP：AttendanceMarked 通知為選配（docs/06 §4），本步不發 → no-op。
        return;
      default:
        // 未知事件型別 → 忽略（標為已派發，不阻塞 dispatcher）。
        return;
    }
  }
}
