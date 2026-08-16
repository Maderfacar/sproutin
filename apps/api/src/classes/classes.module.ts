import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

// 班級 domain 模組（Step 7c 讀取 + 階段2 刀2 管理）。imports：AuthModule（guards）、AuditModule。
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
