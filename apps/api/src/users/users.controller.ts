import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import type { Role } from '@sproutin/db';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService, UserView } from './users.service';

const ROLE_VALUES = ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN'] as const;

// 邊界輸入驗證（zod，比照既有 controller 慣例）。
const createUserSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  role: z.enum(ROLE_VALUES),
});

const updateUserSchema = z
  .object({
    displayName: z.string().trim().min(1).max(40),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .partial()
  .strict();

// 人員帳號端點（docs/07 §4e）。授權：OWNER/ADMIN（園務管理）。
// 帳號無刪除 —— 停用即不能登入（AuthService 於 login 與 /me 兩處擋）。
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles('OWNER', 'ADMIN')
  async list(@Query('role') role?: string): Promise<UserView[]> {
    const valid = ROLE_VALUES.find((r) => r === role);
    return this.users.list(valid as Role | undefined);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Req() req: AuthedRequest, @Body() body: unknown): Promise<UserView> {
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.users.create(req.user!, parsed.data);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<UserView> {
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.users.update(req.user!, id, parsed.data);
  }
}
