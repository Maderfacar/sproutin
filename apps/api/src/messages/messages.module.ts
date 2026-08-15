import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

// 訊息模組（Phase 7 Step 4）。imports：AuthModule（guards + ScopeResolver）、AuditModule。
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
