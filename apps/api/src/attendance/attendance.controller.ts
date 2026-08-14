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
import { AttendanceService, AttendanceView } from './attendance.service';

// 邊界輸入驗證（zod）。與 shared CreateAttendanceDto 同形狀（inline，比照 auth/leaves controller）。
const markSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(['PRESENT', 'ABSENT', 'LEAVE', 'LATE']),
});

const updateSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LEAVE', 'LATE']),
});

// Attendance 端點（docs/07 §3）。授權鏈：JwtAuthGuard → RolesGuard（粗粒度）;
// 資料列級（自班 / 自己小孩 / override）在 AttendanceService 內以 ScopeResolver 判斷。
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  // GET /attendance?classId=&date=（staff 班級視圖）或 ?studentId=（家長/該生視圖）。
  @Get()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN')
  async list(
    @Req() req: AuthedRequest,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
    @Query('date') date?: string,
  ): Promise<AttendanceView[]> {
    if (!classId && !studentId) {
      throw new BadRequestException('classId_or_studentId_required');
    }
    return this.attendance.list(req.user!, { classId, studentId, date });
  }

  // POST /attendance — 手動標記（source=MANUAL）。
  @Post()
  @Roles('ADMIN', 'TEACHER')
  async mark(@Req() req: AuthedRequest, @Body() body: unknown): Promise<AttendanceView> {
    const parsed = markSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.attendance.mark(req.user!, parsed.data);
  }

  // PATCH /attendance/:id — 修改（原為 Derived → 轉 MANUAL override）。
  @Patch(':id')
  @Roles('ADMIN', 'TEACHER')
  async update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AttendanceView> {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.attendance.update(req.user!, id, parsed.data.status);
  }
}
