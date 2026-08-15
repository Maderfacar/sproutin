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
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MessagesService, MessageView } from './messages.service';

const sendMessageSchema = z.object({
  studentId: z.string().min(1),
  category: z.enum(['GENERAL', 'HEALTH', 'BEHAVIOR', 'ADMIN']).optional(),
  body: z.string().min(1).max(2000),
});

// 訊息端點（Student-centered，雙向）。授權鏈：JwtAuthGuard → RolesGuard（粗粒度）;
// 資料列級（自己小孩 / 自班 / 全校）在 MessagesService 以 ScopeResolver.canAccessStudent 判斷。
@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // POST /messages — 發訊（校方與家長皆可，綁在 student 上）。
  @Post()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  async send(@Req() req: AuthedRequest, @Body() body: unknown): Promise<MessageView> {
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    const user = req.user!;
    return this.messages.send(user, parsed.data);
  }

  // GET /messages?studentId= — 該學生訊息（scope 過濾）。
  @Get()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  async list(@Req() req: AuthedRequest, @Query('studentId') studentId?: string): Promise<MessageView[]> {
    if (!studentId) {
      throw new BadRequestException('studentId_required');
    }
    const user = req.user!;
    return this.messages.listForStudent(user, studentId);
  }

  // PATCH /messages/:id/read — 標記已讀。
  @Patch(':id/read')
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  async markRead(@Req() req: AuthedRequest, @Param('id') id: string): Promise<{ ok: true }> {
    const user = req.user!;
    return this.messages.markRead(user, id);
  }
}
