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
import type { LeaveStatus } from '@sproutin/db';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LeavesService, LeaveView } from './leaves.service';

// 邊界輸入驗證（zod）。與 shared CreateLeaveDto / UpdateLeaveStatusDto 同形狀;
// controller 就地驗證避免 runtime 依賴 shared（同 auth.controller 慣例）。
const createLeaveSchema = z.object({
  studentId: z.string().min(1),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  reason: z.string().min(1).max(500),
});

const updateStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(500).optional(),
});

// Leave 端點（docs/07 §3-4）。授權鏈：JwtAuthGuard（登入）→ RolesGuard（粗粒度角色）;
// 資料列級授權（自己小孩 / 自班 / 申請者本人）在 LeavesService 內以 ScopeResolver 判斷
// （POST 的 studentId 在 body、cancel 為「申請者或班級管理者」，皆不適用 param-based ScopeGuard）。
@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeavesController {
  constructor(private readonly leaves: LeavesService) {}

  // POST /leaves — 申請請假。OWNER 不申請（docs/05 matrix）。
  @Post()
  @Roles('ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  async create(@Req() req: AuthedRequest, @Body() body: unknown): Promise<LeaveView> {
    const parsed = createLeaveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    const user = req.user!;
    return this.leaves.create(user, parsed.data);
  }

  // GET /leaves?studentId=（單一學生）或 ?classId=&status=（整班,老師審核用,Step 7c）。
  @Get()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  async list(
    @Req() req: AuthedRequest,
    @Query('studentId') studentId?: string,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
  ): Promise<LeaveView[]> {
    const user = req.user!;
    const allowedStatus = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
    const parsedStatus =
      status && allowedStatus.includes(status) ? (status as LeaveStatus) : undefined;

    if (studentId) {
      return this.leaves.listForStudent(user, studentId);
    }
    if (classId) {
      return this.leaves.listForClass(user, classId, parsedStatus);
    }
    // 無 studentId/classId → 全校視角（OWNER/ADMIN;service 內授權，Step 7d）。
    return this.leaves.listForSchool(user, parsedStatus);
  }

  // PATCH /leaves/:id/status — 審核 approve/reject（TEACHER 自班 / ADMIN）。
  @Patch(':id/status')
  @Roles('ADMIN', 'TEACHER')
  async setStatus(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeaveView> {
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    const user = req.user!;
    return this.leaves.setStatus(user, id, parsed.data.status, parsed.data.reviewNote);
  }

  // PATCH /leaves/:id/cancel — 取消（申請者本人 / OWNER / ADMIN / TEACHER 自班）。
  @Patch(':id/cancel')
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  async cancel(@Req() req: AuthedRequest, @Param('id') id: string): Promise<LeaveView> {
    const user = req.user!;
    return this.leaves.cancel(user, id);
  }
}
