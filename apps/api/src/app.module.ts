import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { HealthModule } from './core/health/health.module';
import { PublicConfigModule } from './core/config/public-config.module';
import { AuthModule } from './auth/auth.module';

// 核心橫切模組 + Phase 6 vertical slice：AuthModule（LINE/LIFF 登入 → JWT）。
@Module({
  imports: [PrismaModule, HealthModule, PublicConfigModule, AuthModule],
})
export class AppModule {}
