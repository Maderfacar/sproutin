import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { StudentsService, StudentView } from './students.service';

// Step 4 端到端讀取切片：GET /me/students
// 只需登入（JwtAuthGuard）;「看得到誰」由後端依角色/scope 過濾（Rule 5/6）。
// 家長→自己小孩、老師→自班、OWNER/ADMIN→全校。
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeStudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get('students')
  async myStudents(@Req() req: AuthedRequest): Promise<StudentView[]> {
    const user = req.user!;
    return this.students.listForUser(user.id, user.roles);
  }
}
