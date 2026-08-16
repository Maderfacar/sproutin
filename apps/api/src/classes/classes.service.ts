import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';

export interface ClassView {
  id: string;
  name: string;
  studentCount: number;
}

export interface ClassActor {
  id: string;
  roles: AuthUser['roles'];
}

const CLASS_SELECT = {
  id: true,
  name: true,
  _count: { select: { students: true } },
} as const;

type ClassRow = { id: string; name: string; _count: { students: number } };

function toView(row: ClassRow): ClassView {
  return { id: row.id, name: row.name, studentCount: row._count.students };
}

// 班級（Step 7c 讀取 + Phase 9 階段2 刀2 管理）。
// 授權在後端（Rule 5/6）：讀 → OWNER/ADMIN 全校、TEACHER/BUS_TEACHER 自己任教班級;
// 寫（建立/改名/刪除）→ OWNER/ADMIN（docs/05 矩陣 Class=CRUD）。寫入與 AuditLog 同一交易。
@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listForUser(userId: string, roles: AuthUser['roles']): Promise<ClassView[]> {
    const roleNames = new Set(roles.map((r) => r.role));

    if (roleNames.has('OWNER') || roleNames.has('ADMIN')) {
      const rows = await this.prisma.class.findMany({ select: CLASS_SELECT, orderBy: { name: 'asc' } });
      return rows.map(toView);
    }

    if (roleNames.has('TEACHER') || roleNames.has('BUS_TEACHER')) {
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: { userId },
        select: { class: { select: CLASS_SELECT } },
      });
      const byId = new Map<string, ClassView>();
      for (const a of assignments) byId.set(a.class.id, toView(a.class));
      return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }

    return [];
  }

  // POST /classes — 建立班級（OWNER/ADMIN）。班名於園內唯一（避免點名時分不清）。
  async create(actor: ClassActor, name: string): Promise<ClassView> {
    const school = await this.prisma.school.findFirst({ select: { id: true } });
    if (!school) {
      throw new BadRequestException('school_not_found');
    }
    await this.assertNameAvailable(name, null);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.class.create({
        data: { schoolId: school.id, name },
        select: CLASS_SELECT,
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'class.create',
        resourceType: 'Class',
        resourceId: created.id,
        result: 'SUCCESS',
        metadata: { name },
      });
      return toView(created);
    });
  }

  // PATCH /classes/:id — 改班名（OWNER/ADMIN）。
  async rename(actor: ClassActor, id: string, name: string): Promise<ClassView> {
    await this.getOrThrow(id);
    await this.assertNameAvailable(name, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.class.update({ where: { id }, data: { name }, select: CLASS_SELECT });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'class.rename',
        resourceType: 'Class',
        resourceId: id,
        result: 'SUCCESS',
        metadata: { name },
      });
      return toView(updated);
    });
  }

  // DELETE /classes/:id — 僅在班內沒有學生、也沒有老師編制時允許（不刪資料，避免歷史紀錄成孤兒）。
  async remove(actor: ClassActor, id: string): Promise<void> {
    const existing = await this.getOrThrow(id);
    if (existing._count.students > 0) {
      throw new ConflictException('class_has_students');
    }
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: { classId: id },
      select: { id: true },
    });
    if (assignment) {
      throw new ConflictException('class_has_teachers');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.class.delete({ where: { id } });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'class.delete',
        resourceType: 'Class',
        resourceId: id,
        result: 'SUCCESS',
        metadata: { name: existing.name },
      });
    });
  }

  private async getOrThrow(id: string): Promise<ClassRow> {
    const found = await this.prisma.class.findUnique({ where: { id }, select: CLASS_SELECT });
    if (!found) {
      throw new NotFoundException('class_not_found');
    }
    return found;
  }

  // 同名班級會讓老師/家長在點名與訊息中分不清 → 建立與改名都擋（改名時排除自己）。
  private async assertNameAvailable(name: string, exceptId: string | null): Promise<void> {
    const duplicate = await this.prisma.class.findFirst({
      where: { name, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('class_name_taken');
    }
  }

  private actorRole(actor: ClassActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
