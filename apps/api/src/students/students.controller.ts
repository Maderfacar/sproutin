import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ScopeGuard } from '../auth/scope.guard';
import { Roles } from '../auth/roles.decorator';
import { Scope } from '../auth/scope.decorator';
import { AuditRead } from '../core/audit/audit-read.decorator';
import { StudentsService, StudentView } from './students.service';

// Step 3 示範端點：GET /students/:id
// 授權鏈：JwtAuthGuard（登入）→ RolesGuard（粗粒度角色）→ ScopeGuard（資料列級）。
// 後端授權;前端不決定（Rule 5/6）。
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  // 敏感 READ（學生 PII 詳情）→ 記 out-of-band READ 稽核（ADR-005 白名單）。
  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'GUARDIAN')
  @Scope('student', 'id')
  @AuditRead({ resourceType: 'Student', action: 'student.read', param: 'id' })
  async getOne(@Param('id') id: string): Promise<StudentView> {
    return this.students.getById(id);
  }
}
