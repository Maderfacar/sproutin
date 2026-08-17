import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { BusController } from './bus.controller';
import { MeBusController } from './me-bus.controller';
import { BusSettingsService } from './bus-settings.service';
import { BusRidesService } from './bus-rides.service';

// 娃娃車 / 接送模組（Phase 9 ⑦ 刀1）。
// 這是「以獨立 module 加入」的未來 domain（docs/04 修正 B）：既有模組一行都沒改，
// 請假自動移出乘車名單是在 events/ 訂閱既有的 LeaveApproved / LeaveCancelled（docs/06 §4）。
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [BusController, MeBusController],
  providers: [BusSettingsService, BusRidesService],
})
export class BusModule {}
