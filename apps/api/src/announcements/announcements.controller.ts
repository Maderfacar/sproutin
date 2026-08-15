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

  // GET /announcements — 本人可見公告（全校 + 相關班級）。
  @Get()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  async list(@Req() req: AuthedRequest): Promise<AnnouncementView[]> {
    const user = req.user!;
    return this.announcements.listForUser(user);
  }
}
