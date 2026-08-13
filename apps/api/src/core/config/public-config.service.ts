import { Injectable } from '@nestjs/common';
import type { PublicConfig } from '@sproutin/shared';

// GET /config/public 的資料來源 (ADR-001)。
// 骨架：先回 env 衍生的最小 public config；DB migration + seed 後改讀該校 SchoolConfig。
// 嚴禁回傳任何 secret 或 API_INTERNAL_URL（server-only）。
@Injectable()
export class PublicConfigService {
  get(): PublicConfig {
    return {
      schoolSlug: process.env.SCHOOL_SLUG ?? 'dev',
      brandName: 'Sproutin',
      logoUrl: null,
      primaryColor: '#2E7D32',
      secondaryColor: '#A5D6A7',
      bannerUrl: null,
      liffId: null,
      lineOaChannelId: null,
      lineOaBasicId: null,
      apiBaseUrl: null, // 通常 same-origin；絕不放 API_INTERNAL_URL
      featureFlags: {},
      cardOrder: [],
      leaveRequiresApproval: true,
    };
  }
}
