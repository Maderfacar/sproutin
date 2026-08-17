import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { BusRidesService } from './bus-rides.service';
import type { MyBusView } from './bus.types';

// GET /me/bus?studentId= —— 家長看自己小孩的今日乘車狀態。
// 只需登入；「看得到誰」由 ScopeResolver.canAccessStudent 在 service 內判斷（Rule 5/6）。
// 家長**不能改接送點**（會讓路線亂掉，Human Owner 定案），所以這裡只有讀。
// 「明天不搭車」屬刀 2。
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeBusController {
  constructor(private readonly rides: BusRidesService) {}

  @Get('bus')
  async myBus(
    @Req() req: AuthedRequest,
    @Query('studentId') studentId?: string,
    @Query('date') date?: string,
  ): Promise<MyBusView> {
    if (!studentId) throw new BadRequestException('studentId_required');
    return this.rides.myBus(req.user!, studentId, date);
  }
}
