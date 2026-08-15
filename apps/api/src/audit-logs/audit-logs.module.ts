import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

// 稽核查詢模組（Phase 7 Step 6）。imports AuthModule（JwtAuthGuard + RolesGuard）。
// audit.read 的記錄由全域 AuditReadInterceptor（AppModule）處理，無需在此注入 AuditModule。
@Module({
  imports: [AuthModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
})
export class AuditLogsModule {}
