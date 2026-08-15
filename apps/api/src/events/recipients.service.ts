import { Injectable } from '@nestjs/common';
import type { Prisma } from '@sproutin/db';

// 事件 → Notification 收件人解析（以 Student 為核心，docs/02 §2）。
//   guardians = 該生所有監護人（Guardianship）
//   teachers  = 該生班級的老師（TeacherAssignment）
//   admins    = 全校管理者（UserRole OWNER / ADMIN）
// 方法接受 tx（在 handler 的交易內查詢），確保與投影/回滾同一致讀取視圖。
export interface StudentRecipients {
  guardians: string[];
  teachers: string[];
  admins: string[];
}

@Injectable()
export class RecipientsService {
  async forStudent(tx: Prisma.TransactionClient, studentId: string): Promise<StudentRecipients> {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });

    const guardianships = await tx.guardianship.findMany({
      where: { studentId },
      select: { userId: true },
    });

    const assignments = student
      ? await tx.teacherAssignment.findMany({
          where: { classId: student.classId },
          select: { userId: true },
        })
      : [];

    const adminRoles = await tx.userRole.findMany({
      where: { role: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    });

    return {
      guardians: unique(guardianships.map((g) => g.userId)),
      teachers: unique(assignments.map((a) => a.userId)),
      admins: unique(adminRoles.map((r) => r.userId)),
    };
  }
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}
