import { BadRequestException, Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { SchoolAdminConfig } from '@sproutin/shared';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolConfigService } from './school-config.service';

// 邊界輸入驗證（zod）。與 shared UpdateSchoolConfigDto 同形狀;
// controller 就地驗證避免 runtime 依賴 shared（同 auth/leaves controller 慣例）。
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const IMAGE_REF = /^(https?:\/\/|\/)[^\s]*$/; // 外部網址或站內相對路徑（內建圖庫）
const FEATURE_KEY = /^[a-z][a-z0-9-]{0,30}$/;

const updateSchoolConfigSchema = z
  .object({
    brandName: z.string().min(1).max(60),
    logoUrl: z.string().max(2000).regex(IMAGE_REF).nullable(),
    bannerUrl: z.string().max(2000).regex(IMAGE_REF).nullable(),
    primaryColor: z.string().regex(HEX_COLOR),
    secondaryColor: z.string().regex(HEX_COLOR),
    featureFlags: z.record(z.string().regex(FEATURE_KEY), z.boolean()),
    cardOrder: z.array(z.string().regex(FEATURE_KEY)).max(40),
    leaveRequiresApproval: z.boolean(),
  })
  .partial()
  .strict(); // 未知欄位一律拒絕，避免誤寫入其他設定

// 園所設定端點（docs/07 §3）。授權：OWNER/ADMIN（docs/05 矩陣，2026-08-17 放寬 ADMIN 為 CRUD）。
// 資料列級 scope 不適用——每校獨立 DB，該 instance 只有自己的 SchoolConfig。
@Controller('school/config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolConfigController {
  constructor(private readonly schoolConfig: SchoolConfigService) {}

  @Get()
  @Roles('OWNER', 'ADMIN')
  async get(): Promise<SchoolAdminConfig> {
    return this.schoolConfig.get();
  }

  @Patch()
  @Roles('OWNER', 'ADMIN')
  async update(@Req() req: AuthedRequest, @Body() body: unknown): Promise<SchoolAdminConfig> {
    const parsed = updateSchoolConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    const user = req.user!;
    return this.schoolConfig.update(user, parsed.data);
  }
}
