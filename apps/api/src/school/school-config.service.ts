import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser, SchoolAdminConfig } from '@sproutin/shared';
import type { Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';

// 園所設定（品牌 / 功能卡片 / 請假是否審核）。每校獨立 DB (§19) → 該 instance 只有一筆 SchoolConfig。
// 讀：OWNER/ADMIN;寫：OWNER/ADMIN（docs/05 矩陣，2026-08-17 Human Owner 放寬 ADMIN 為 CRUD）。
// 寫入與 AuditLog 同一 transaction（ADR-005 類別一）;metadata 只記「改了哪些欄位」，不存整包值。
export interface SchoolConfigActor {
  id: string;
  roles: AuthUser['roles'];
}

export type UpdateSchoolConfigInput = Partial<
  Pick<
    SchoolAdminConfig,
    | 'brandName'
    | 'logoUrl'
    | 'bannerUrl'
    | 'primaryColor'
    | 'secondaryColor'
    | 'featureFlags'
    | 'cardOrder'
    | 'leaveRequiresApproval'
  >
>;

@Injectable()
export class SchoolConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // GET /school/config
  async get(): Promise<SchoolAdminConfig> {
    const config = await this.prisma.schoolConfig.findFirst();
    if (!config) {
      throw new BadRequestException('school_config_not_found');
    }
    return this.toView(config);
  }

  // PATCH /school/config — 局部更新;未帶的欄位不動。
  async update(actor: SchoolConfigActor, input: UpdateSchoolConfigInput): Promise<SchoolAdminConfig> {
    const current = await this.prisma.schoolConfig.findFirst({ select: { id: true } });
    if (!current) {
      throw new BadRequestException('school_config_not_found');
    }

    const data = this.toData(input);
    const changedFields = Object.keys(data);
    if (changedFields.length === 0) {
      throw new BadRequestException('no_changes');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.schoolConfig.update({ where: { id: current.id }, data });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'school.config.update',
        resourceType: 'SchoolConfig',
        resourceId: updated.id,
        result: 'SUCCESS',
        metadata: { fields: changedFields },
      });

      return this.toView(updated);
    });
  }

  // 只挑白名單欄位進 update data，避免把未知欄位帶入 Prisma。
  private toData(input: UpdateSchoolConfigInput): Prisma.SchoolConfigUpdateInput {
    const data: Prisma.SchoolConfigUpdateInput = {};
    if (input.brandName !== undefined) data.brandName = input.brandName;
    if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
    if (input.bannerUrl !== undefined) data.bannerUrl = input.bannerUrl;
    if (input.primaryColor !== undefined) data.primaryColor = input.primaryColor;
    if (input.secondaryColor !== undefined) data.secondaryColor = input.secondaryColor;
    if (input.featureFlags !== undefined) data.featureFlags = input.featureFlags as Prisma.InputJsonValue;
    if (input.cardOrder !== undefined) data.cardOrder = input.cardOrder as Prisma.InputJsonValue;
    if (input.leaveRequiresApproval !== undefined) data.leaveRequiresApproval = input.leaveRequiresApproval;
    return data;
  }

  // Prisma Json 欄位為 unknown 形狀 → 安全窄化（比照 PublicConfigService）。
  private toView(config: {
    brandName: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    bannerUrl: string | null;
    featureFlags: unknown;
    cardOrder: unknown;
    leaveRequiresApproval: boolean;
    theme: string;
    dashboardLayout: string;
  }): SchoolAdminConfig {
    return {
      brandName: config.brandName,
      logoUrl: config.logoUrl,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      bannerUrl: config.bannerUrl,
      featureFlags: this.asFlags(config.featureFlags),
      cardOrder: this.asStringArray(config.cardOrder),
      leaveRequiresApproval: config.leaveRequiresApproval,
      theme: config.theme,
      dashboardLayout: config.dashboardLayout,
    };
  }

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

  private actorRole(actor: SchoolConfigActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
