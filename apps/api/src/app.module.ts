import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { HealthModule } from './core/health/health.module';
import { PublicConfigModule } from './core/config/public-config.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { LeavesModule } from './leaves/leaves.module';

// 核心橫切模組 + Phase 6 vertical slice + Phase 7 domain：
// AuthModule（Step 2：LINE/LIFF 登入 → JWT）+ StudentsModule（Step 3：RBAC 示範端點）
// + LeavesModule（Phase 7 Step 1：Leave 狀態機 + Outbox 寫入 + transactional audit）。
@Module({
  imports: [
    PrismaModule,
    HealthModule,
    PublicConfigModule,
    AuthModule,
    StudentsModule,
    LeavesModule,
  ],
})
export class AppModule {}
