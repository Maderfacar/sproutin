import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';

// Leave domain 模組（Phase 7 Step 1）。
// imports：AuthModule（guards + ScopeResolver）、AuditModule（transactional audit）。
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [LeavesController],
  providers: [LeavesService],
})
export class LeavesModule {}
