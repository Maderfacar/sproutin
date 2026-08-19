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

// 學生整合視圖（階段2 刀5）：一次帶回班名與監護人，讓「一個學生的全貌」不必打好幾支 API。
// 授權沿用 GET /students/:id 的 ScopeGuard（老師自班 / 家長自己小孩 / OWNER·ADMIN 全校）+ 敏感 READ 稽核。
export interface StudentGuardianView {
  userId: string;
  displayName: string;
  relation: string;
  isPrimary: boolean;
}

export interface StudentDetailView extends StudentView {
  className: string;
  guardians: StudentGuardianView[];
}

const STUDENT_VIEW = { id: true, name: true, classId: true, status: true } as const;

// 「只要某一種關係」的縮小範圍（不取角色聯集）。與前端的身分一一對應：
// 家長 → GUARDIAN、導師 → TEACHING。**只縮小，永遠不放大。**
export type StudentRelationScope = 'GUARDIAN' | 'TEACHING';

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

  // GET /students/:id/detail — 學生整合視圖（基本資料 + 班名 + 監護人）。
  async getDetail(id: string): Promise<StudentDetailView> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        ...STUDENT_VIEW,
        class: { select: { name: true } },
        guardianships: {
          select: {
            relation: true,
            isPrimary: true,
            userId: true,
            user: { select: { displayName: true } },
          },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('student_not_found');
    }
    return {
      id: student.id,
      name: student.name,
      classId: student.classId,
      status: student.status,
      className: student.class.name,
      guardians: student.guardianships.map((g) => ({
        userId: g.userId,
        displayName: g.user.displayName,
        relation: g.relation,
        isPrimary: g.isPrimary,
      })),
    };
  }

  // 「只要某一種關係」的縮小範圍（不取角色聯集）。見 listForUser 的說明。
  // 這兩個值與前端的身分（persona）一一對應：家長→GUARDIAN、導師→TEACHING。
  //
  // Step 4 讀取切片：後端依角色/scope 回「這個使用者能看到的學生」（docs/05 §2-3）。
  // 授權在後端（Rule 5/6）;前端只顯示回傳結果。多角色取聯集、去重。
  // classId 為選填篩選（階段2 刀2 管理介面用）——**篩選不放寬授權**，只在可見範圍內再縮小。
  //
  // relation='GUARDIAN' 表示「**只要我監護的小孩**」，不取聯集（Human Owner 2026-08-20 回報）：
  // 前端改成一次只用一種身分之後，園長兼家長的人切到家長身分，這支端點仍回全校 125 位，
  // 於是「選擇孩子」列出全校名單、首頁還把第一個陌生小孩當成他的孩子。
  // 這是資料範圍的問題不是版面問題 —— **一定要在後端切開**，前端過濾等於名單仍然送到瀏覽器。
  // 同理它也**不放寬**任何權限：沒有監護關係就回空陣列，就算他是園長。
  async listForUser(
    userId: string,
    roles: AuthUser['roles'],
    classId?: string,
    relation?: StudentRelationScope,
  ): Promise<StudentView[]> {
    const roleNames = new Set(roles.map((r) => r.role));

    // relation='TEACHING' ＝「**只要我實際帶的班上的孩子**」，同樣不取聯集。
    // 園長兼導師的人切到導師身分時，點名與聯絡簿都只該看到自己那一班。
    if (relation === 'TEACHING') {
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: { userId },
        select: { classId: true },
      });
      const classIds = assignments.map((a) => a.classId);
      if (classIds.length === 0) return [];
      const rows = await this.prisma.student.findMany({
        where: classId ? { classId: { in: classIds.filter((c) => c === classId) } } : { classId: { in: classIds } },
        select: STUDENT_VIEW,
        orderBy: { name: 'asc' },
      });
      return rows;
    }

    if (relation === 'GUARDIAN') {
      const guardianships = await this.prisma.guardianship.findMany({
        where: { userId },
        select: { student: { select: STUDENT_VIEW } },
      });
      const mine = guardianships.map((g) => g.student);
      const scoped = classId ? mine.filter((s) => s.classId === classId) : mine;
      return scoped.sort((a, b) => a.name.localeCompare(b.name));
    }

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
