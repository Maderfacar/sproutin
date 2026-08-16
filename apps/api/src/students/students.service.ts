import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type { StudentStatus } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';

export interface StudentView {
  id: string;
  name: string;
  classId: string;
  status: StudentStatus;
}

export interface StudentActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface CreateStudentInput {
  name: string;
  classId: string;
}

export interface UpdateStudentInput {
  name?: string;
  classId?: string;
  status?: StudentStatus;
}

const STUDENT_VIEW = { id: true, name: true, classId: true, status: true } as const;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
  // classId 為選填篩選（階段2 刀2 管理介面用）——**篩選不放寬授權**，只在可見範圍內再縮小。
  async listForUser(
    userId: string,
    roles: AuthUser['roles'],
    classId?: string,
  ): Promise<StudentView[]> {
    const roleNames = new Set(roles.map((r) => r.role));

    // OWNER / ADMIN：全校。
    if (roleNames.has('OWNER') || roleNames.has('ADMIN')) {
      return this.prisma.student.findMany({
        where: classId ? { classId } : undefined,
        select: STUDENT_VIEW,
        orderBy: { name: 'asc' },
      });
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

    const visible = [...byId.values()];
    const filtered = classId ? visible.filter((s) => s.classId === classId) : visible;
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  // POST /students — 新增學生（OWNER/ADMIN;docs/07 §3）。與 AuditLog 同一交易。
  async create(actor: StudentActor, input: CreateStudentInput): Promise<StudentView> {
    await this.assertClassExists(input.classId);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: { name: input.name, classId: input.classId },
        select: STUDENT_VIEW,
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'student.create',
        resourceType: 'Student',
        resourceId: created.id,
        result: 'SUCCESS',
        scopeType: 'CLASS',
        scopeId: input.classId,
        metadata: { fields: ['name', 'classId'] },
      });
      return created;
    });
  }

  // PATCH /students/:id — 改姓名 / 換班 / 改在學狀態（OWNER/ADMIN）。
  // 「只停用不刪除」：畢業或離校改 status，不刪資料（出缺勤/請假/訊息等歷史需保留）。
  async update(actor: StudentActor, id: string, input: UpdateStudentInput): Promise<StudentView> {
    const existing = await this.getById(id);

    const data: UpdateStudentInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.classId !== undefined) data.classId = input.classId;
    if (input.status !== undefined) data.status = input.status;

    const changedFields = Object.keys(data);
    if (changedFields.length === 0) {
      throw new BadRequestException('no_changes');
    }
    if (data.classId) {
      await this.assertClassExists(data.classId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({ where: { id }, data, select: STUDENT_VIEW });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'student.update',
        resourceType: 'Student',
        resourceId: id,
        result: 'SUCCESS',
        scopeType: 'CLASS',
        scopeId: updated.classId,
        // 只記欄位名與班級異動（姓名屬 PII，不入稽核明文，修正 C）。
        metadata: {
          fields: changedFields,
          ...(data.classId ? { fromClassId: existing.classId, toClassId: data.classId } : {}),
        },
      });
      return updated;
    });
  }

  private async assertClassExists(classId: string): Promise<void> {
    const found = await this.prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
    if (!found) {
      throw new BadRequestException('class_not_found');
    }
  }

  private actorRole(actor: StudentActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
