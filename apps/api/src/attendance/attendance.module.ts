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
})
export class AttendanceModule {}
