import { Module } from '@nestjs/common';
import { PrismaModule } from '../core/prisma/prisma.module';
import { AuditModule } from '../core/audit/audit.module';
import { RecipientsService } from './recipients.service';
import { NotificationService } from './notification.service';
import { LeaveEventHandler } from './leave-event.handler';
import { EventHandlersService } from './event-handlers.service';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

// Worker 專用精簡 DI 圖（worker.ts 以 NestFactory.createApplicationContext 啟動）。
// 只含 Outbox dispatch + 事件 handler 所需 provider;不 import HTTP/Auth 控制器（worker 無 web 層）。
// 重用 PrismaService（@Global PrismaModule）+ AuditService（AuditModule），不複製業務碼（決策 2 = A）。
@Module({
  imports: [PrismaModule, AuditModule],
  providers: [
    RecipientsService,
    NotificationService,
    LeaveEventHandler,
    EventHandlersService,
    OutboxDispatcherService,
  ],
})
export class WorkerModule {}
