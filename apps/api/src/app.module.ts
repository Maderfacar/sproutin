import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { HealthModule } from './core/health/health.module';
import { PublicConfigModule } from './core/config/public-config.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';

// 核心橫切模組 + Phase 6 vertical slice：
// AuthModule（Step 2：LINE/LIFF 登入 → JWT）+ StudentsModule（Step 3：RBAC 示範端點）。
@Module({
  imports: [PrismaModule, HealthModule, PublicConfigModule, AuthModule, StudentsModule],
})
export class AppModule {}
