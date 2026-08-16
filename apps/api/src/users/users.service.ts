import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type { Role, UserStatus } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';

// 人員帳號（老師 / 行政 / 家長）管理。docs/05：使用者與角色屬園務管理 → OWNER/ADMIN。
//
// 兩個刻意的設計：
//  1. **只停用不刪除**（Human Owner 決策）：帳號留著，status=INACTIVE 即無法登入
//     （AuthService 於 login 與 /me 兩處擋）。刪除會讓其建立的請假/訊息/稽核失去歸屬。
//  2. **UserRole 一律建 SCHOOL scope**：實際的班級層級授權來自 TeacherAssignment
//     （見 ScopeResolver），UserRole 只決定「有哪些角色」。避免兩處各存一份班級歸屬而不同步。
export interface UserActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface UserRoleView {
  role: Role;
  scopeType: string;
  scopeId: string | null;
}

export interface GuardianOfView {
  id: string; // Guardianship id（解除綁定用）
  studentId: string;
  studentName: string;
  relation: string;
  isPrimary: boolean;
}

export interface TeachingView {
  id: string; // TeacherAssignment id（解除編制用）
  classId: string;
  className: string;
}

export interface UserView {
  id: string;
  displayName: string;
  status: UserStatus;
  hasLineLinked: boolean; // 本人的 LINE 是否已綁上這個帳號
  roles: UserRoleView[];
  guardianOf: GuardianOfView[];
  teaching: TeachingView[];
}

export interface CreateUserInput {
  displayName: string;
  role: Role;
}

export interface UpdateUserInput {
  displayName?: string;
  status?: UserStatus;
}

const USER_INCLUDE = {
  roles: true,
  lineIdentity: { select: { id: true } },
  guardianOf: { select: { id: true, studentId: true, relation: true, isPrimary: true, student: { select: { name: true } } } },
  teaching: { select: { id: true, classId: true, class: { select: { name: true } } } },
} as const;

type UserRow = {
  id: string;
  displayName: string;
  status: UserStatus;
  roles: { role: Role; scopeType: string; scopeId: string | null }[];
  lineIdentity: { id: string } | null;
  guardianOf: {
    id: string;
    studentId: string;
    relation: string;
    isPrimary: boolean;
    student: { name: string };
  }[];
  teaching: { id: string; classId: string; class: { name: string } }[];
};

function toView(row: UserRow): UserView {
  return {
    id: row.id,
    displayName: row.displayName,
    status: row.status,
    hasLineLinked: row.lineIdentity !== null,
    roles: row.roles.map((r) => ({ role: r.role, scopeType: r.scopeType, scopeId: r.scopeId })),
    guardianOf: row.guardianOf.map((g) => ({
      id: g.id,
      studentId: g.studentId,
      studentName: g.student.name,
      relation: g.relation,
      isPrimary: g.isPrimary,
    })),
    teaching: row.teaching.map((t) => ({ id: t.id, classId: t.classId, className: t.class.name })),
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // GET /users?role= — 人員清單（含角色、綁定的小孩、任教班級）。
  async list(role?: Role): Promise<UserView[]> {
    const rows = await this.prisma.user.findMany({
      where: role ? { roles: { some: { role } } } : undefined,
      include: USER_INCLUDE,
      orderBy: { displayName: 'asc' },
    });
    return (rows as UserRow[]).map(toView);
  }

  async getById(id: string): Promise<UserView> {
    const row = await this.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
    if (!row) {
      throw new NotFoundException('user_not_found');
    }
    return toView(row as UserRow);
  }

  // POST /users — 建立帳號 + 一個角色。此時尚未綁 LINE（本人首次登入前無法使用）。
  async create(actor: UserActor, input: CreateUserInput): Promise<UserView> {
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { displayName: input.displayName } });
      await tx.userRole.create({
        data: { userId: user.id, role: input.role, scopeType: 'SCHOOL', scopeId: null },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'user.create',
        resourceType: 'User',
        resourceId: user.id,
        result: 'SUCCESS',
        // 姓名屬 PII，稽核只記角色（修正 C）。
        metadata: { role: input.role },
      });
      return user.id;
    });
    return this.getById(created);
  }

  // PATCH /users/:id — 改顯示名稱 / 啟用停用。
  async update(actor: UserActor, id: string, input: UpdateUserInput): Promise<UserView> {
    await this.getById(id); // 不存在 → 404

    const data: UpdateUserInput = {};
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.status !== undefined) data.status = input.status;

    const changedFields = Object.keys(data);
    if (changedFields.length === 0) {
      throw new BadRequestException('no_changes');
    }

    // 停用最後一個園長會讓園所沒有人能管理 → 擋下。
    if (data.status === 'INACTIVE') {
      await this.assertNotLastActiveOwner(id);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'user.update',
        resourceType: 'User',
        resourceId: id,
        result: 'SUCCESS',
        metadata: { fields: changedFields, ...(data.status ? { status: data.status } : {}) },
      });
    });
    return this.getById(id);
  }

  private async assertNotLastActiveOwner(id: string): Promise<void> {
    const isOwner = await this.prisma.userRole.findFirst({
      where: { userId: id, role: 'OWNER' },
      select: { id: true },
    });
    if (!isOwner) {
      return;
    }
    const otherActiveOwners = await this.prisma.user.count({
      where: { id: { not: id }, status: 'ACTIVE', roles: { some: { role: 'OWNER' } } },
    });
    if (otherActiveOwners === 0) {
      throw new BadRequestException('last_owner_cannot_be_disabled');
    }
  }

  private actorRole(actor: UserActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
