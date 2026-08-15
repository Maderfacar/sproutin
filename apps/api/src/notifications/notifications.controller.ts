import { Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { NotificationsService, NotificationView } from './notifications.service';

// Notification 端點（站內通知讀取端）。只需登入;本人資料由 service 以 userId 過濾（不需 RolesGuard/ScopeGuard）。
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // GET /notifications?unread=true — 本人通知列表。
  @Get()
  async list(
    @Req() req: AuthedRequest,
    @Query('unread') unread?: string,
  ): Promise<NotificationView[]> {
    const user = req.user!;
    return this.notifications.listForUser({ id: user.id }, unread === 'true');
  }

  // PATCH /notifications/:id/read — 標記已讀。
  @Patch(':id/read')
  async markRead(@Req() req: AuthedRequest, @Param('id') id: string): Promise<NotificationView> {
    const user = req.user!;
    return this.notifications.markRead({ id: user.id }, id);
  }
}
