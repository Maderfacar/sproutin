import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';

// 橫切稽核模組（transactional audit，ADR-005 類別一）。
// 供各 domain 模組（Leave/Attendance/Message…）注入 AuditService。
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
