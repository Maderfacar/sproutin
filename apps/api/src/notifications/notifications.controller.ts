import { BadRequestException, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import {
  NotificationsService,
  NotificationView,
  type NotificationRelationScope,
} from './notifications.service';

function parseRelation(value: string | undefined): NotificationRelationScope | undefined {
  if (value === undefined) return undefined;
  if (value !== 'GUARDIAN') {
    throw new BadRequestException('invalid_relation');
  }
  return value;
}

// Notification 端點（站內通知讀取端）。只需登入;本人資料由 service 以 userId 過濾（不需 RolesGuard/ScopeGuard）。
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // GET /notifications?unread=true&relation=GUARDIAN — 本人通知列表。
  //
  // ?relation=GUARDIAN → **只要跟我監護的小孩有關的**（家長身分）。通知一向只發給本人，
  // 所以這不放寬任何權限，只把「世界」切開：兼老師的家長切到家長身分之後，
  // 收件匣裡不該躺著別班孩子的聯絡簿通知（Human Owner 2026-08-20 回報）。
  @Get()
  async list(
    @Req() req: AuthedRequest,
    @Query('unread') unread?: string,
    @Query('relation') relation?: string,
  ): Promise<NotificationView[]> {
    const user = req.user!;
    return this.notifications.listForUser({ id: user.id }, unread === 'true', parseRelation(relation));
  }

  // PATCH /notifications/:id/read — 標記已讀。
  @Patch(':id/read')
  async markRead(@Req() req: AuthedRequest, @Param('id') id: string): Promise<NotificationView> {
    const user = req.user!;
    return this.notifications.markRead({ id: user.id }, id);
  }
}
