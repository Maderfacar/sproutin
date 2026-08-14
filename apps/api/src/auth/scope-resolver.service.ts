import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';

// 資料列級授權解析（docs/05 §3）：判斷「這筆資料是不是你的」。
// 以 JWT 帶來的 roles 決定檢查路徑，實際歸屬以 DB 為準（Rule 6：不信任前端）。
@Injectable()
export class ScopeResolver {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessStudent(
    userId: string,
    roles: AuthUser['roles'],
    studentId: string,
  ): Promise<boolean> {
    const roleNames = new Set(roles.map((r) => r.role));

    // OWNER / ADMIN：全校範圍（docs/05 §2）。
    if (roleNames.has('OWNER') || roleNames.has('ADMIN')) {
      return true;
    }

    // TEACHER：僅自己任教班級的學生。
    if (roleNames.has('TEACHER') || roleNames.has('BUS_TEACHER')) {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { classId: true },
      });
      if (student) {
        const assignment = await this.prisma.teacherAssignment.findFirst({
          where: { userId, classId: student.classId },
          select: { id: true },
        });
        if (assignment) return true;
      }
    }

    // PARENT / GUARDIAN：僅自己監護的學生（Guardianship）。
    if (roleNames.has('PARENT') || roleNames.has('GUARDIAN')) {
      const guardianship = await this.prisma.guardianship.findFirst({
        where: { userId, studentId },
        select: { id: true },
      });
      if (guardianship) return true;
    }

    return false;
  }
}
