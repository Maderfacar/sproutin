import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { StudentsService, StudentView } from './students.service';

// Step 4 端到端讀取切片：GET /me/students
// 只需登入（JwtAuthGuard）;「看得到誰」由後端依角色/scope 過濾（Rule 5/6）。
// 家長→自己小孩、老師→自班、OWNER/ADMIN→全校。
//
// ?relation=GUARDIAN → **只要我監護的小孩**，不取聯集（Human Owner 2026-08-20 回報）。
// 前端改成一次只用一種身分之後，園長兼家長的人切到家長身分仍拿到全校名單，
// 「選擇孩子」就列出全校 125 位、首頁還把第一個陌生小孩當成他的孩子。
// 這一段**只縮小不放寬**：沒有監護關係就回空陣列，就算他是園長。
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeStudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get('students')
  async myStudents(
    @Req() req: AuthedRequest,
    @Query('relation') relation?: string,
  ): Promise<StudentView[]> {
    if (relation !== undefined && relation !== 'GUARDIAN') {
      throw new BadRequestException('invalid_relation');
    }
    const user = req.user!;
    return this.students.listForUser(user.id, user.roles, undefined, relation);
  }
}
