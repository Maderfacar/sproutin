import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { PushCampaignsController } from './push-campaigns.controller';
import { PushCampaignsService } from './push-campaigns.service';

// 後台的 LINE 群發（Phase 9 階段3）。api 端只負責排入 + 查紀錄；
// 真正送到 LINE 在 worker（events/push-campaign-event.handler.ts）。
// 收件人解析（campaign-audience.ts）刻意是純函式而非 provider，兩邊各自呼叫，不產生模組相依。
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PushCampaignsController],
  providers: [PushCampaignsService],
})
export class PushCampaignsModule {}
