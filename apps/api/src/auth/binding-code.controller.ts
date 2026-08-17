import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthedRequest, JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { BindingCodeService, BindingCodeView } from './binding-code.service';

// 綁定碼的管理端（docs/07 §4g）。全部 OWNER/ADMIN —— 這是「誰能代表園所把人放進系統」的權限，
// 等同開門權，不下放給老師。兌換端在 POST /auth/line/bind（未認證即可呼叫）。
const issueSchema = z.object({
  userId: z.string().min(1),
  ttlDays: z.number().int().min(1).max(180).optional(),
});

@Controller('binding-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BindingCodeController {
  constructor(private readonly codes: BindingCodeService) {}

  // GET /binding-codes?userId= — 目前有效的碼（供後台顯示與列印）。
  @Get()
  @Roles('OWNER', 'ADMIN')
  async list(@Query('userId') userId?: string): Promise<BindingCodeView[]> {
    return this.codes.list(userId);
  }

  // POST /binding-codes — 簽發新碼（同一帳號既有未使用的碼會一併作廢）。
  @Post()
  @Roles('OWNER', 'ADMIN')
  async issue(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BindingCodeView> {
    const parsed = issueSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.codes.issue(req.user!, parsed.data.userId, parsed.data.ttlDays);
  }

  // DELETE /binding-codes/:id — 作廢（保留紀錄供稽核）。
  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(204)
  async revoke(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
    return this.codes.revoke(req.user!, id);
  }
}
