import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '@sproutin/shared';
import { AuthService, LoginResult } from './auth.service';
import { AuthedRequest, JwtAuthGuard } from './jwt-auth.guard';

// 邊界輸入驗證（zod）。與 shared LineLoginDto 同形狀；API 端就地驗證避免 runtime 依賴 shared。
const lineLoginSchema = z.object({ idToken: z.string().min(1) });
// 綁定碼含分隔符與空白時放寬長度上限，實際格式由 service 正規化後判斷。
const lineBindSchema = z.object({ idToken: z.string().min(1), code: z.string().min(1).max(32) });

// 回應形狀對齊 docs/07-api-contract（raw 物件，與 /health、/config/public 一致）。
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /auth/line/login — LIFF idToken → Sproutin JWT（未認證即可呼叫）。
  @Post('auth/line/login')
  async login(@Body() body: unknown): Promise<LoginResult> {
    const parsed = lineLoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.auth.loginWithLine(parsed.data.idToken);
  }

  // POST /auth/line/bind — 尚未綁定者輸入園所發的綁定碼 → 綁定並直接登入（未認證即可呼叫）。
  @Post('auth/line/bind')
  async bind(@Body() body: unknown): Promise<LoginResult> {
    const parsed = lineBindSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.auth.bindWithLine(parsed.data.idToken, parsed.data.code);
  }

  // GET /me — 目前登入者 + 角色（需 JWT）。
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthedRequest): Promise<AuthUser> {
    // JwtAuthGuard 通過後 req.user 必存在。
    const userId = req.user!.id;
    return this.auth.me(userId);
  }
}
