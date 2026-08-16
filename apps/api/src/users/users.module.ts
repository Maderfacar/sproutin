import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { UsersController } from './users.controller';
import { GuardianshipsController, TeacherAssignmentsController } from './relations.controller';
import { UsersService } from './users.service';
import { RelationsService } from './relations.service';

// 人員帳號與關聯 domain 模組（Phase 9 階段2 刀3）。imports：AuthModule（guards）、AuditModule。
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [UsersController, GuardianshipsController, TeacherAssignmentsController],
  providers: [UsersService, RelationsService],
})
export class UsersModule {}
