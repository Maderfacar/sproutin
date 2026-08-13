import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { HealthModule } from './core/health/health.module';
import { PublicConfigModule } from './core/config/public-config.module';

// 骨架：只掛核心橫切模組。domain 模組（auth/leave/attendance...）待 vertical slice 階段加入。
@Module({
  imports: [PrismaModule, HealthModule, PublicConfigModule],
})
export class AppModule {}
