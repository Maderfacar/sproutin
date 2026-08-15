import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditEnqueuer } from './audit-enqueuer.service';

// 橫切稽核模組（ADR-005）。
//   - AuditService：transactional（類別一）+ out-of-band 單筆寫入（Worker consumer 用）。
//   - AuditEnqueuer：out-of-band producer（類別二）——DENIED / FAILURE / 敏感 READ enqueue 至 `audit` 佇列。
// 供各 domain 模組（transactional）、AuthModule（guards 的 DENIED）、AppModule（全域攔截器）注入。
@Module({
  providers: [AuditService, AuditEnqueuer],
  exports: [AuditService, AuditEnqueuer],
})
export class AuditModule {}
