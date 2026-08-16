import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

// Attendance domain 模組（Phase 7 Step 2）。
// imports：AuthModule（guards + ScopeResolver）、AuditModule（transactional audit）。
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  // 匯出供 CommunicationBookModule 的「點名即到校」在同一交易內重用（不複製出缺勤規則）。
  exports: [AttendanceService],
})
export class AttendanceModule {}
