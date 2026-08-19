import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { StudentsService, StudentView, StudentRelationScope } from './students.service';

const RELATIONS: readonly StudentRelationScope[] = ['GUARDIAN', 'TEACHING'];

function parseRelation(value: string | undefined): StudentRelationScope | undefined {
  if (value === undefined) return undefined;
  if (!RELATIONS.includes(value as StudentRelationScope)) {
    throw new BadRequestException('invalid_relation');
  }
  return value as StudentRelationScope;
}

// Step 4 端到端讀取切片：GET /me/students
// 只需登入（JwtAuthGuard）;「看得到誰」由後端依角色/scope 過濾（Rule 5/6）。
// 不帶參數＝角色聯集：家長→自己小孩、老師→自班、OWNER/ADMIN→全校。
//
// ?relation=GUARDIAN｜TEACHING → **只要那一種關係**，不取聯集（Human Owner 2026-08-20 回報）。
// 前端改成一次只用一種身分之後，園長兼導師兼家長的人切過去仍拿到全校名單：
// 家長身分的「選擇孩子」列出全校 125 位、導師身分的點名頁列出別人的班。
// 這一段**只縮小不放寬**：沒有那層關係就回空陣列，就算他是園長。
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeStudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get('students')
  async myStudents(
    @Req() req: AuthedRequest,
    @Query('relation') relation?: string,
  ): Promise<StudentView[]> {
    const user = req.user!;
    return this.students.listForUser(user.id, user.roles, undefined, parseRelation(relation));
  }
}
