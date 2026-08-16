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
import { ScopeGuard } from '../auth/scope.guard';
import { Roles } from '../auth/roles.decorator';
import { Scope } from '../auth/scope.decorator';
import { AuditRead } from '../core/audit/audit-read.decorator';
import { StudentsService, StudentDetailView, StudentView } from './students.service';

// 邊界輸入驗證（zod，比照 leaves/school controller 慣例）。
const createStudentSchema = z.object({
  name: z.string().trim().min(1).max(40),
  classId: z.string().min(1),
});

const updateStudentSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    classId: z.string().min(1),
    status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED']),
  })
  .partial()
  .strict();

// 學生端點（docs/07 §3）。
// 授權鏈：JwtAuthGuard（登入）→ RolesGuard（粗粒度角色）→ ScopeGuard（資料列級，僅標 @Scope 的端點）。
// 後端授權;前端不決定（Rule 5/6）。
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  // GET /students?classId= — 可見範圍內的學生（scope 過濾在 service;classId 只縮小不放寬）。
  @Get()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN')
  async list(
    @Req() req: AuthedRequest,
    @Query('classId') classId?: string,
  ): Promise<StudentView[]> {
    const user = req.user!;
    return this.students.listForUser(user.id, user.roles, classId);
  }

  // 敏感 READ（學生 PII 詳情）→ 記 out-of-band READ 稽核（ADR-005 白名單）。
  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  @Scope('student', 'id')
  @AuditRead({ resourceType: 'Student', action: 'student.read', param: 'id' })
  async getOne(@Param('id') id: string): Promise<StudentView> {
    return this.students.getById(id);
  }

  // GET /students/:id/detail — 學生整合視圖（基本資料 + 班名 + 監護人;階段2 刀5）。
  // 與 GET /students/:id 同一條授權鏈與敏感 READ 稽核，只是回傳更完整。
  @Get(':id/detail')
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  @Scope('student', 'id')
  @AuditRead({ resourceType: 'Student', action: 'student.read_detail', param: 'id' })
  async getDetail(@Param('id') id: string): Promise<StudentDetailView> {
    return this.students.getDetail(id);
  }

  // POST /students — 新增學生（OWNER/ADMIN;階段2 刀2）。
  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Req() req: AuthedRequest, @Body() body: unknown): Promise<StudentView> {
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.students.create(req.user!, parsed.data);
  }

  // PATCH /students/:id — 改姓名 / 換班 / 改在學狀態（OWNER/ADMIN）。不提供刪除（只停用）。
  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<StudentView> {
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.students.update(req.user!, id, parsed.data);
  }
}
