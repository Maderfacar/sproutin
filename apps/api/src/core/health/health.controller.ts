import { Controller, Get } from '@nestjs/common';

// GET /health — Orchestrator 部署批次推進的存活探針 (docs/09-deployment.md §8)。
// 骨架：先回基本狀態；DB/Redis 連線檢查於 vertical slice 階段補上。
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string; version: string; schemaVersion: string } {
    return {
      status: 'ok',
      version: process.env.APP_VERSION ?? 'dev',
      schemaVersion: process.env.SCHEMA_VERSION ?? 'dev',
    };
  }
}
