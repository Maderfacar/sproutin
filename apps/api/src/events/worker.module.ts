import { Module } from '@nestjs/common';
import { PrismaModule } from '../core/prisma/prisma.module';
import { AuditModule } from '../core/audit/audit.module';
import { RecipientsService } from './recipients.service';
import { NotificationService } from './notification.service';
import { LeaveEventHandler } from './leave-event.handler';
import { MessageEventHandler } from './message-event.handler';
import { AnnouncementEventHandler } from './announcement-event.handler';
import { CommunicationBookEventHandler } from './communication-book-event.handler';
import { EventHandlersService } from './event-handlers.service';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { LinePushClient } from './line-push.client';
import { PushNotificationService } from './push-notification.service';
import { PushCampaignEventHandler } from './push-campaign-event.handler';

// Worker 專用精簡 DI 圖（worker.ts 以 NestFactory.createApplicationContext 啟動）。
// 只含 Outbox dispatch + 事件 handler 所需 provider;不 import HTTP/Auth 控制器（worker 無 web 層）。
// 重用 PrismaService（@Global PrismaModule）+ AuditService（AuditModule），不複製業務碼（決策 2 = A）。
@Module({
  imports: [PrismaModule, AuditModule],
  providers: [
    RecipientsService,
    NotificationService,
    LeaveEventHandler,
    MessageEventHandler,
    AnnouncementEventHandler,
    CommunicationBookEventHandler,
    // 群發（Phase 9 階段3）。收件人解析是純函式（push-campaigns/campaign-audience.ts），
    // 不需要在此註冊 provider —— 也因此 worker 不必 import 任何業務模組。
    PushCampaignEventHandler,
    EventHandlersService,
    OutboxDispatcherService,
    LinePushClient,
    PushNotificationService,
  ],
})
export class WorkerModule {}
