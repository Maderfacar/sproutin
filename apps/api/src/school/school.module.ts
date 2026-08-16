import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { SchoolConfigController } from './school-config.controller';
import { SchoolConfigService } from './school-config.service';

// 園所設定 domain 模組（Phase 9 階段2 刀1）。imports：AuthModule（guards）、AuditModule。
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [SchoolConfigController],
  providers: [SchoolConfigService],
})
export class SchoolModule {}
