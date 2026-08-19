import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ClassesService, ClassView } from './classes.service';

// 邊界輸入驗證（zod，比照 leaves/school controller 慣例）。
const classNameSchema = z.object({ name: z.string().trim().min(1).max(40) });

// 班級端點（docs/07 §3）。讀：老師端點名/公告/審核用（scope 過濾在 service）;
// 寫：OWNER/ADMIN 管理班級（Phase 9 階段2 刀2）。
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  // ?scope=TEACHING → **只回我實際帶的班**，不取角色聯集（Human Owner 2026-08-20 回報：
  // 園長兼導師切到導師身分後，點名頁的班級選擇器列出全校的班）。只縮小不放寬。
  @Get()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER')
  async list(@Req() req: AuthedRequest, @Query('scope') scope?: string): Promise<ClassView[]> {
    if (scope !== undefined && scope !== 'TEACHING') {
      throw new BadRequestException('invalid_scope');
    }
    const user = req.user!;
    return this.classes.listForUser(user.id, user.roles, scope);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Req() req: AuthedRequest, @Body() body: unknown): Promise<ClassView> {
    const parsed = classNameSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.classes.create(req.user!, parsed.data.name);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async rename(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ClassView> {
    const parsed = classNameSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.classes.rename(req.user!, id, parsed.data.name);
  }

  // 刪除僅在空班（無學生、無老師編制）時允許;否則 409（docs/05「只停用不刪除」原則的班級版本）。
  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(204)
  async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
    return this.classes.remove(req.user!, id);
  }
}
