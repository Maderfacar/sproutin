import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BusSettingsService } from './bus-settings.service';
import { BusRidesService } from './bus-rides.service';
import type {
  BusAssignmentView,
  BusPointView,
  BusRideView,
  BusRosterView,
  BusRouteView,
} from './bus.types';

// 邊界輸入驗證（zod），inline 於 controller —— api 不從 shared 取執行期值（全站慣例）。
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = z.string().regex(HHMM).nullable().optional();
const DIRECTION = ['MORNING', 'AFTERNOON'] as const;

const routeSchema = z.object({
  name: z.string().min(1).max(40),
  morningDepart: time,
  afternoonDepart: time,
  isActive: z.boolean().optional(),
  busTeacherId: z.string().min(1).nullable().optional(),
});

const pointSchema = z.object({
  routeId: z.string().min(1),
  name: z.string().min(1).max(40),
  address: z.string().max(120).nullable().optional(),
  etaAm: time,
  etaPm: time,
});

const pointPatchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  address: z.string().max(120).nullable().optional(),
  etaAm: time,
  etaPm: time,
});

const reorderSchema = z.object({
  routeId: z.string().min(1),
  direction: z.enum(DIRECTION),
  pointIds: z.array(z.string().min(1)).max(200),
});

const assignmentSchema = z.object({
  studentId: z.string().min(1),
  routeId: z.string().min(1),
  morningPointId: z.string().min(1).nullable().optional(),
  afternoonPointId: z.string().min(1).nullable().optional(),
  ridesMorning: z.boolean().optional(),
  ridesAfternoon: z.boolean().optional(),
});

// 緯經度為選填：拒絕定位權限或沒訊號時前端就是不送，功能照常運作（Human Owner 定案）。
const markSchema = z.object({
  routeId: z.string().min(1),
  date: z.string().datetime(),
  direction: z.enum(DIRECTION),
  studentIds: z.array(z.string().min(1)).min(1).max(200),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// 娃娃車 / 接送（docs/07 §4k）。授權鏈：JwtAuthGuard → RolesGuard（粗粒度）；
// 路線層（隨車老師只能碰自己那條車）在 service 內判斷。
@Controller('bus')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusController {
  constructor(
    private readonly settings: BusSettingsService,
    private readonly rides: BusRidesService,
  ) {}

  // ---------- 設定（路線 / 接送點 / 名單）----------

  // 隨車老師也要讀得到路線（點名畫面要選車），但只會拿到自己被指派的那些。
  @Get('routes')
  @Roles('OWNER', 'ADMIN', 'BUS_TEACHER')
  async listRoutes(@Req() req: AuthedRequest): Promise<BusRouteView[]> {
    return this.settings.listRoutes(req.user!);
  }

  @Post('routes')
  @Roles('OWNER', 'ADMIN')
  async createRoute(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BusRouteView> {
    const parsed = routeSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.settings.createRoute(req.user!, parsed.data);
  }

  @Patch('routes/:id')
  @Roles('OWNER', 'ADMIN')
  async updateRoute(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<BusRouteView> {
    const parsed = routeSchema.partial().safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.settings.updateRoute(req.user!, id, parsed.data);
  }

  @Delete('routes/:id')
  @Roles('OWNER', 'ADMIN')
  async deleteRoute(@Req() req: AuthedRequest, @Param('id') id: string): Promise<{ deleted: true }> {
    return this.settings.deleteRoute(req.user!, id);
  }

  @Post('points')
  @Roles('OWNER', 'ADMIN')
  async createPoint(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BusPointView> {
    const parsed = pointSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.settings.createPoint(req.user!, parsed.data);
  }

  @Patch('points/:id')
  @Roles('OWNER', 'ADMIN')
  async updatePoint(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<BusPointView> {
    const parsed = pointPatchSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.settings.updatePoint(req.user!, id, parsed.data);
  }

  @Delete('points/:id')
  @Roles('OWNER', 'ADMIN')
  async deletePoint(@Req() req: AuthedRequest, @Param('id') id: string): Promise<{ deleted: true }> {
    return this.settings.deletePoint(req.user!, id);
  }

  // 重排接送點順序。上午重排時下午自動跟著倒過來（除非園長已手動排過下午）。
  @Post('points/reorder')
  @Roles('OWNER', 'ADMIN')
  async reorderPoints(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BusPointView[]> {
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.settings.reorderPoints(req.user!, parsed.data);
  }

  @Get('assignments')
  @Roles('OWNER', 'ADMIN')
  async listAssignments(@Query('routeId') routeId?: string): Promise<BusAssignmentView[]> {
    return this.settings.listAssignments(routeId);
  }

  @Put('assignments')
  @Roles('OWNER', 'ADMIN')
  async saveAssignment(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BusAssignmentView> {
    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.settings.saveAssignment(req.user!, parsed.data);
  }

  @Delete('assignments/:studentId')
  @Roles('OWNER', 'ADMIN')
  async removeAssignment(
    @Req() req: AuthedRequest,
    @Param('studentId') studentId: string,
  ): Promise<{ deleted: true }> {
    return this.settings.removeAssignment(req.user!, studentId);
  }

  // ---------- 點名 ----------

  @Get('rides')
  @Roles('OWNER', 'ADMIN', 'BUS_TEACHER')
  async roster(
    @Req() req: AuthedRequest,
    @Query('routeId') routeId?: string,
    @Query('date') date?: string,
    @Query('direction') direction?: string,
  ): Promise<BusRosterView> {
    if (!routeId || !date) throw new BadRequestException('routeId_and_date_required');
    const parsed = z.enum(DIRECTION).safeParse(direction);
    if (!parsed.success) throw new BadRequestException('invalid_direction');
    return this.rides.roster(req.user!, { routeId, date, direction: parsed.data });
  }

  @Post('rides/board')
  @Roles('OWNER', 'ADMIN', 'BUS_TEACHER')
  async board(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BusRideView[]> {
    return this.rides.board(req.user!, this.parseMark(body));
  }

  @Post('rides/alight')
  @Roles('OWNER', 'ADMIN', 'BUS_TEACHER')
  async alight(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BusRideView[]> {
    return this.rides.alight(req.user!, this.parseMark(body));
  }

  @Post('rides/absent')
  @Roles('OWNER', 'ADMIN', 'BUS_TEACHER')
  async absent(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BusRideView[]> {
    return this.rides.absent(req.user!, this.parseMark(body));
  }

  // 誤觸復原。車在動的時候點錯是必然會發生的，沒有這條老師只能留著一筆錯的紀錄。
  @Post('rides/undo')
  @Roles('OWNER', 'ADMIN', 'BUS_TEACHER')
  async undo(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BusRideView[]> {
    return this.rides.undo(req.user!, this.parseMark(body));
  }

  private parseMark(body: unknown) {
    const parsed = markSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return parsed.data;
  }
}
