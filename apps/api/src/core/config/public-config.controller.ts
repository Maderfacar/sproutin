import { Controller, Get } from '@nestjs/common';
import type { PublicConfig } from '@sproutin/shared';
import { PublicConfigService } from './public-config.service';

// GET /config/public — 未認證、只回非機密 runtime config (ADR-001)。
@Controller('config')
export class PublicConfigController {
  constructor(private readonly service: PublicConfigService) {}

  @Get('public')
  async getPublic(): Promise<PublicConfig> {
    return this.service.get();
  }
}
