import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { GuardianRelation } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';
import type { UserActor } from './users.service';

// 人員與學生/班級的關聯：
//   Guardianship      家長 ↔ 學生（一個小孩可有多位家長;一位家長可有多個小孩，可跨班）
//   TeacherAssignment 老師 ↔ 班級（**班級層級授權的真正依據**，見 ScopeResolver）
// 綁定/解除會直接改變「誰看得到誰」，因此每一筆都寫稽核。
@Injectable()
export class RelationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async addGuardianship(
    actor: UserActor,
    input: { userId: string; studentId: string; relation: GuardianRelation; isPrimary?: boolean },
  ): Promise<{ id: string }> {
    await this.assertUserActive(input.userId);
    await this.assertStudentExists(input.studentId);

    const duplicate = await this.prisma.guardianship.findFirst({
      where: { userId: input.userId, studentId: input.studentId },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('guardianship_exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.guardianship.create({
        data: {
          userId: input.userId,
          studentId: input.studentId,
          relation: input.relation,
          isPrimary: input.isPrimary ?? false,
        },
        select: { id: true },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'guardianship.add',
        resourceType: 'Guardianship',
        resourceId: created.id,
        result: 'SUCCESS',
        metadata: { userId: input.userId, studentId: input.studentId, relation: input.relation },
      });
      return created;
    });
  }

  async removeGuardianship(actor: UserActor, id: string): Promise<void> {
    const existing = await this.prisma.guardianship.findUnique({
      where: { id },
      select: { id: true, userId: true, studentId: true },
    });
    if (!existing) {
      throw new NotFoundException('guardianship_not_found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.guardianship.delete({ where: { id } });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'guardianship.remove',
        resourceType: 'Guardianship',
        resourceId: id,
        result: 'SUCCESS',
        metadata: { userId: existing.userId, studentId: existing.studentId },
      });
    });
  }

  async addTeacherAssignment(
    actor: UserActor,
    input: { userId: string; classId: string },
  ): Promise<{ id: string }> {
    await this.assertUserActive(input.userId);
    const cls = await this.prisma.class.findUnique({
      where: { id: input.classId },
      select: { id: true },
    });
    if (!cls) {
      throw new BadRequestException('class_not_found');
    }

    const duplicate = await this.prisma.teacherAssignment.findFirst({
      where: { userId: input.userId, classId: input.classId },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('assignment_exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.teacherAssignment.create({
        data: { userId: input.userId, classId: input.classId, role: 'HOMEROOM' },
        select: { id: true },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'teacher_assignment.add',
        resourceType: 'TeacherAssignment',
        resourceId: created.id,
        result: 'SUCCESS',
        metadata: { userId: input.userId, classId: input.classId },
      });
      return created;
    });
  }

  async removeTeacherAssignment(actor: UserActor, id: string): Promise<void> {
    const existing = await this.prisma.teacherAssignment.findUnique({
      where: { id },
      select: { id: true, userId: true, classId: true },
    });
    if (!existing) {
      throw new NotFoundException('assignment_not_found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.teacherAssignment.delete({ where: { id } });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'teacher_assignment.remove',
        resourceType: 'TeacherAssignment',
        resourceId: id,
        result: 'SUCCESS',
        metadata: { userId: existing.userId, classId: existing.classId },
      });
    });
  }

  private async assertUserExists(userId: string): Promise<void> {
    const found = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!found) {
      throw new BadRequestException('user_not_found');
    }
  }

  // 停用的帳號不能再被指派班級或綁定小孩（Human Owner 2026-08-20 回報：
  // 已停用的帳號仍可分配導師身分）。這不是刁難，是避免製造**幽靈關聯**：
  // 班級名單上掛著一個登不進來的老師，之後帳號一旦重新啟用又會默默帶著權限回來。
  // 要指派就先啟用他 —— 而**移除**關聯不受此限，那正是清理停用帳號要做的事。
  private async assertUserActive(userId: string): Promise<void> {
    const found = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!found) {
      throw new BadRequestException('user_not_found');
    }
    if (found.status !== 'ACTIVE') {
      throw new ConflictException('user_disabled');
    }
  }

  private async assertStudentExists(studentId: string): Promise<void> {
    const found = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!found) {
      throw new BadRequestException('student_not_found');
    }
  }

  private actorRole(actor: UserActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
