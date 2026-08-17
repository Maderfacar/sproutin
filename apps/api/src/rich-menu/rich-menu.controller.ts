import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  RichMenuService,
  type ApplyResult,
  type RichMenuConfigView,
} from './rich-menu.service';
import {
  AUDIENCE_VALUES,
  TARGET_VALUES,
  type RichMenuAudienceName,
} from './rich-menu.types';

// controller 的 zod schema 一律 inline（既有慣例：api 不從 shared 匯入執行期的值）。
const saveSchema = z.object({
  template: z.enum(['SIX', 'FOUR', 'TWO']),
  imageUrl: z.string().url().nullable(),
  // LINE 限 14 字（已查證）。前端也擋，但真正的邊界在這裡。
  chatBarText: z.string().trim().min(1).max(14),
  items: z
    .array(
      z.object({
        index: z.number().int().min(0).max(19), // LINE 一份選單最多 20 格
        target: z.enum(TARGET_VALUES as [string, ...string[]]),
      }),
    )
    .max(20),
});

// 園所圖文選單設定（docs/07 §4h）。授權：OWNER/ADMIN（園務外觀屬園所管理）。
@Controller('rich-menus')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RichMenuController {
  constructor(private readonly richMenus: RichMenuService) {}

  @Get()
  @Roles('OWNER', 'ADMIN')
  async list(): Promise<RichMenuConfigView[]> {
    return this.richMenus.list();
  }

  // 儲存設計 —— **不碰 LINE**。園長調版面時會存很多次，而 LINE 的「建立選單」
  // 有每小時 100 次上限，兩者必須分開。
  @Put(':audience')
  @Roles('OWNER', 'ADMIN')
  async save(
    @Req() req: AuthedRequest,
    @Param('audience') audience: string,
    @Body() body: unknown,
  ): Promise<RichMenuConfigView> {
    const target = this.parseAudience(audience);
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.richMenus.save(req.user!, target, {
      template: parsed.data.template,
      imageUrl: parsed.data.imageUrl,
      chatBarText: parsed.data.chatBarText,
      items: parsed.data.items as { index: number; target: never }[],
    });
  }

  // 真的送到 LINE：建新選單 → 上傳底圖 → 綁人（或設為預設）→ 刪掉舊的。
  @Post(':audience/apply')
  @Roles('OWNER', 'ADMIN')
  async apply(
    @Req() req: AuthedRequest,
    @Param('audience') audience: string,
  ): Promise<ApplyResult> {
    return this.richMenus.apply(req.user!, this.parseAudience(audience));
  }

  private parseAudience(value: string): RichMenuAudienceName {
    const found = AUDIENCE_VALUES.find((a) => a === value);
    if (!found) {
      throw new BadRequestException('invalid_input');
    }
    return found;
  }
}
