import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';

export interface StudentView {
  id: string;
  name: string;
  classId: string;
}

const STUDENT_VIEW = { id: true, name: true, classId: true } as const;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<StudentView> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: STUDENT_VIEW,
    });
    if (!student) {
      throw new NotFoundException('student_not_found');
    }
    return student;
  }

  // Step 4 讀取切片：後端依角色/scope 回「這個使用者能看到的學生」（docs/05 §2-3）。
  // 授權在後端（Rule 5/6）;前端只顯示回傳結果。多角色取聯集、去重。
  async listForUser(userId: string, roles: AuthUser['roles']): Promise<StudentView[]> {
    const roleNames = new Set(roles.map((r) => r.role));

    // OWNER / ADMIN：全校。
    if (roleNames.has('OWNER') || roleNames.has('ADMIN')) {
      return this.prisma.student.findMany({ select: STUDENT_VIEW, orderBy: { name: 'asc' } });
    }

    const byId = new Map<string, StudentView>();

    // TEACHER / BUS_TEACHER：自己任教班級的學生。
    if (roleNames.has('TEACHER') || roleNames.has('BUS_TEACHER')) {
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: { userId },
        select: { classId: true },
      });
      const classIds = assignments.map((a) => a.classId);
      if (classIds.length > 0) {
        const students = await this.prisma.student.findMany({
          where: { classId: { in: classIds } },
          select: STUDENT_VIEW,
        });
        for (const s of students) byId.set(s.id, s);
      }
    }

    // PARENT / GUARDIAN：自己監護的學生。
    if (roleNames.has('PARENT') || roleNames.has('GUARDIAN')) {
      const guardianships = await this.prisma.guardianship.findMany({
        where: { userId },
        select: { student: { select: STUDENT_VIEW } },
      });
      for (const g of guardianships) byId.set(g.student.id, g.student);
    }

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
