import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { CommunicationBookController } from './communication-book.controller';
import { CommunicationBookService } from './communication-book.service';

// 每日聯絡簿模組（Phase 9 階段2 刀4）。
// imports：AuthModule（guards + ScopeResolver）、AuditModule（transactional audit）、
//          AttendanceModule（「點名即到校」重用出缺勤規則，不複製 ADR-002 邏輯）。
@Module({
  imports: [AuthModule, AuditModule, AttendanceModule],
  controllers: [CommunicationBookController],
  providers: [CommunicationBookService],
})
export class CommunicationBookModule {}
