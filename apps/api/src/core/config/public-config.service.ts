import { Injectable } from '@nestjs/common';
import type { PublicConfig } from '@sproutin/shared';
import { PrismaService } from '../prisma/prisma.service';

// GET /config/public 的資料來源 (ADR-001)。
// 每校獨立 DB (§19)：讀該 instance 唯一的 SchoolConfig；DB 未 seed 時回最小 fallback。
// 嚴禁回傳任何 secret 或 API_INTERNAL_URL（server-only）。
@Injectable()
export class PublicConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<PublicConfig> {
    const schoolSlug = process.env.SCHOOL_SLUG ?? 'dev';

    // 每個 instance 對應一間學校 → 取唯一一筆 SchoolConfig。
    const config = await this.prisma.schoolConfig.findFirst();

    if (config) {
      return {
        schoolSlug,
        brandName: config.brandName,
        logoUrl: config.logoUrl,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        bannerUrl: config.bannerUrl,
        liffId: config.liffId,
        lineOaChannelId: config.lineOaChannelId,
        lineOaBasicId: config.lineOaBasicId,
        apiBaseUrl: config.apiBaseUrl,
        featureFlags: this.asFlags(config.featureFlags),
        cardOrder: this.asStringArray(config.cardOrder),
        leaveRequiresApproval: config.leaveRequiresApproval,
      };
    }

    // Fallback：DB 尚未 seed；回最小 public config，不含任何 secret / internal URL。
    return {
      schoolSlug,
      brandName: 'Sproutin',
      logoUrl: null,
      primaryColor: '#2E7D32',
      secondaryColor: '#A5D6A7',
      bannerUrl: null,
      liffId: process.env.LIFF_ID ?? null,
      lineOaChannelId: null,
      lineOaBasicId: null,
      apiBaseUrl: null,
      featureFlags: {},
      cardOrder: [],
      leaveRequiresApproval: true,
    };
  }

  // Prisma Json 欄位為 unknown 形狀 → 安全窄化為 public 型別。
  private asFlags(value: unknown): Record<string, boolean> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const out: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === 'boolean') out[k] = v;
      }
      return out;
    }
    return {};
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  }
}
