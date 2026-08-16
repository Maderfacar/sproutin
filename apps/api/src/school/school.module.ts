import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SchoolConfigController } from './school-config.controller';
import { SchoolConfigService } from './school-config.service';

// 園所設定 domain 模組（Phase 9 階段2 刀1）。imports AuthModule（guards）;AuditService 由全域 AuditModule 提供。
@Module({
  imports: [AuthModule],
  controllers: [SchoolConfigController],
  providers: [SchoolConfigService],
})
export class SchoolModule {}
