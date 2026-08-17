import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  PushCampaignsService,
  type CampaignView,
  type RecipientPreview,
} from './push-campaigns.service';
import {
  APP_PAGE_VALUES,
  AUDIENCE_VALUES,
  BODY_MAX,
  BUTTON_LABEL_MAX,
  FIELD_VALUE_MAX,
  TEMPLATE_VALUES,
  TITLE_MAX,
  type AppPageName,
  type PushCampaignAudienceName,
  type PushCampaignTemplateName,
} from './push-campaign.types';

// controller 的 zod schema 一律 inline（既有慣例：api 不從 shared 匯入執行期的值）。
const createSchema = z.object({
  template: z.enum(TEMPLATE_VALUES as [string, ...string[]]),
  audience: z.enum(AUDIENCE_VALUES as [string, ...string[]]),
  classId: z.string().min(1).nullish(),
  title: z.string().trim().min(1).max(TITLE_MAX),
  body: z.string().trim().max(BODY_MAX).default(''),
  imageUrl: z.string().url().nullish(),
  fields: z.record(z.string().max(FIELD_VALUE_MAX)).default({}),
  button: z
    .object({
      label: z.string().trim().min(1).max(BUTTON_LABEL_MAX),
      page: z.enum(APP_PAGE_VALUES as [string, ...string[]]).optional(),
      // 外部網址（Human Owner 定案：可外部）。**限 https** —— LINE 的 uri action 不吃 http，
      // 且真正的邊界在後端，前端的提示只是提示。
      url: z.string().url().startsWith('https://').optional(),
    })
    .nullish(),
});

// 後台的 LINE 群發（docs/07 §4j）。
// 授權：**只有 OWNER/ADMIN** —— 群發會產生費用且送出後無法收回，不下放給老師。
@Controller('push-campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PushCampaignsController {
  constructor(private readonly campaigns: PushCampaignsService) {}

  // 送出前算「這次會送出幾則」。刻意是獨立端點：園長改一次收件範圍就重算一次，
  // 不必先建立一筆才知道人數。
  @Get('recipients')
  @Roles('OWNER', 'ADMIN')
  async recipients(
    @Query('audience') audience: string,
    @Query('classId') classId?: string,
  ): Promise<RecipientPreview> {
    const found = AUDIENCE_VALUES.find((a) => a === audience);
    if (!found) {
      throw new BadRequestException('invalid_input');
    }
    return this.campaigns.previewRecipients(found, classId ?? null);
  }

  @Get()
  @Roles('OWNER', 'ADMIN')
  async list(): Promise<CampaignView[]> {
    return this.campaigns.list();
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Req() req: AuthedRequest, @Body() body: unknown): Promise<CampaignView> {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    const data = parsed.data;
    return this.campaigns.create(req.user!, {
      template: data.template as PushCampaignTemplateName,
      audience: data.audience as PushCampaignAudienceName,
      classId: data.classId ?? null,
      title: data.title,
      body: data.body,
      imageUrl: data.imageUrl ?? null,
      fields: data.fields,
      button: data.button
        ? {
            label: data.button.label,
            page: data.button.page as AppPageName | undefined,
            url: data.button.url,
          }
        : null,
    });
  }
}
