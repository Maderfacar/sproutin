import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';

export interface ClassView {
  id: string;
  name: string;
}

const CLASS_VIEW = { id: true, name: true } as const;

// 班級清單（Step 7c，老師端點名/公告/審核需知道自己的班級 + 班名）。
// 授權在後端（Rule 5/6）：OWNER/ADMIN 全校;TEACHER/BUS_TEACHER 自己任教班級;其餘空。
@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, roles: AuthUser['roles']): Promise<ClassView[]> {
    const roleNames = new Set(roles.map((r) => r.role));

    if (roleNames.has('OWNER') || roleNames.has('ADMIN')) {
      return this.prisma.class.findMany({ select: CLASS_VIEW, orderBy: { name: 'asc' } });
    }

    if (roleNames.has('TEACHER') || roleNames.has('BUS_TEACHER')) {
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: { userId },
        select: { class: { select: CLASS_VIEW } },
      });
      const byId = new Map<string, ClassView>();
      for (const a of assignments) byId.set(a.class.id, a.class);
      return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }

    return [];
  }
}
