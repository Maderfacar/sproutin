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
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AnnouncementsService, AnnouncementView } from './announcements.service';

const publishSchema = z.object({
  scope: z.enum(['SCHOOL', 'CLASS']),
  classId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

// 編輯只收標題與內文。`.strict()` 是刻意的：有人試著改 scope／classId 會被擋成
// invalid_input，而不是靜靜忽略那兩個欄位讓他以為改成功了。
const updateSchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
  })
  .partial()
  .strict();

// 公告端點。發布走 RolesGuard 粗粒度（OWNER/ADMIN/TEACHER）+ service 內班級管理判斷;
// 讀取依使用者可見範圍在 service 過濾。
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  // POST /announcements — 發布（OWNER/ADMIN 全校或班級;TEACHER 限自班）。
  @Post()
  @Roles('OWNER', 'ADMIN', 'TEACHER')
  async publish(@Req() req: AuthedRequest, @Body() body: unknown): Promise<AnnouncementView> {
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    const user = req.user!;
    return this.announcements.publish(user, parsed.data);
  }

  // PATCH /announcements/:id — 改標題／內文。誰能改由 service 判斷
  //（園長、行政、發布的人自己）—— RolesGuard 這一層只做粗篩。
  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'TEACHER')
  async update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AnnouncementView> {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.announcements.update(req.user!, id, parsed.data);
  }

  // DELETE /announcements/:id — 站內刪除（LINE 已送出的推播收不回來）。
  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'TEACHER')
  @HttpCode(204)
  async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
    return this.announcements.remove(req.user!, id);
  }

  // GET /announcements — 本人可見公告（全校 + 相關班級）。
  @Get()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  async list(@Req() req: AuthedRequest): Promise<AnnouncementView[]> {
    const user = req.user!;
    return this.announcements.listForUser(user);
  }
}
