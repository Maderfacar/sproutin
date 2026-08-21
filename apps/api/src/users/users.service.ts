import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  // POST /users/:id/roles — 增加一個身分。
  // 為什麼需要：建錯了要能改；老師自己的小孩也在園裡（同時是老師與家長）是幼兒園常態；
  // 升任行政、園長交接也都靠這裡。資料模型本就支援多角色，先前只是沒有寫入端點。
  // DELETE /users/:id — 真的把帳號刪掉。
  //
  // 原本是「只停用不刪除」（見檔案開頭）。Human Owner 2026-08-20 決定在正式營運前開放刪除：
  // 測試階段會產生一堆用不到的帳號，全部留著只會讓人員清單越來越難讀。
  //
  // **這個動作無法復原，所以有三道防呆：**
  //   ① 只能刪**已停用**的帳號 —— 要刪一個人得先停用他。手滑點到在職老師的機率因此接近零。
  //   ② 不能刪自己。
  //   ③ 最後一位園長不可刪（與停用同一條規則，理由也一樣：園所會沒有人能管理，而且刪掉之後
  //      連「重新啟用」這條退路都沒有了）。
  //
  // 有外鍵的五張表要先清乾淨，否則資料庫會擋下這筆刪除。
  // **其餘紀錄不會跟著消失**：請假、訊息、公告、聯絡簿留言、稽核紀錄存的是 userId 字串
  // 而不是外鍵，刪掉之後那些紀錄還在，只是查不到名字 —— 那正是當初決定不刪除的理由，
  // 現在是在測試階段刻意接受這個代價。正式營運前要再評估一次（見 docs/project/07）。
  async remove(actor: UserActor, id: string): Promise<void> {
    const target = await this.getById(id); // 不存在 → 404

    if (id === actor.id) {
      throw new BadRequestException('cannot_delete_self');
    }
    if (target.status !== 'INACTIVE') {
      throw new ConflictException('user_must_be_disabled_first');
    }
    await this.assertNotLastActiveOwner(id, 'last_owner_cannot_be_deleted');

    await this.prisma.$transaction(async (tx) => {
      await tx.lineIdentity.deleteMany({ where: { userId: id } });
      await tx.bindingCode.deleteMany({ where: { userId: id } });
      await tx.guardianship.deleteMany({ where: { userId: id } });
      await tx.teacherAssignment.deleteMany({ where: { userId: id } });
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'user.delete',
        resourceType: 'User',
        resourceId: id,
        result: 'SUCCESS',
        // 姓名屬 PII，不進稽核（同 user.create）。留角色與解除的關聯數量：
        // 日後在稽核裡看到這個 id，至少知道他是什麼身分、身上掛過幾個孩子與班級。
        metadata: {
          roles: target.roles.map((r) => r.role),
          removedGuardianships: target.guardianOf.length,
          removedTeaching: target.teaching.length,
          hadLineLinked: target.hasLineLinked,
        },
      });
    });
  }

  async grantRole(actor: UserActor, id: string, role: Role): Promise<UserView> {
    const target = await this.getById(id);

    // 園長身分只有現任園長能給 —— 否則行政可以自行升級，權限矩陣形同虛設。
    this.assertMayChangeOwnerRole(actor, role);

    // 停用的帳號不能再拿到新身分（Human Owner 2026-08-20 回報）。
    // 幽靈權限比沒有權限更危險：他登不進來，但帳號一旦重新啟用就默默帶著這個身分回來。
    // **移除**身分不受此限 —— 那正是清理停用帳號要做的事。
    if (target.status !== 'ACTIVE') {
      throw new ConflictException('user_disabled');
    }

    if (target.roles.some((r) => r.role === role)) {
      throw new BadRequestException('role_already_granted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.create({
        data: { userId: id, role, scopeType: 'SCHOOL', scopeId: null },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'user.role_grant',
        resourceType: 'User',
        resourceId: id,
        result: 'SUCCESS',
        metadata: { role },
      });
    });
    return this.getById(id);
  }

  // DELETE /users/:id/roles/:role — 移除一個身分。
  // 一併解除該身分附帶的關聯（不再是老師就不該還掛在班上 —— 幽靈權限比沒有權限更危險）。
  async revokeRole(actor: UserActor, id: string, role: Role): Promise<UserView> {
    const target = await this.getById(id);

    this.assertMayChangeOwnerRole(actor, role);

    if (!target.roles.some((r) => r.role === role)) {
      throw new NotFoundException('role_not_found');
    }
    // 一個身分都沒有的帳號登得進來卻什麼都看不到 —— 那是離職，該用停用而不是拔光身分。
    if (target.roles.length === 1) {
      throw new BadRequestException('last_role_cannot_be_removed');
    }
    if (role === 'OWNER') {
      await this.assertNotLastActiveOwner(id);
    }

    // 移除後是否還保有同類身分（例如同時是 TEACHER 與 BUS_TEACHER，拔掉一個不該連帶清空班級）。
    const remaining = target.roles.filter((r) => r.role !== role).map((r) => r.role);
    const keepsTeaching = remaining.some((r) => r === 'TEACHER' || r === 'BUS_TEACHER');
    const keepsGuardian = remaining.some((r) => r === 'PARENT' || r === 'GUARDIAN');
    const dropTeaching = !keepsTeaching && (role === 'TEACHER' || role === 'BUS_TEACHER');
    const dropGuardian = !keepsGuardian && (role === 'PARENT' || role === 'GUARDIAN');

    await this.prisma.$transaction(async (tx) => {
      // scope 不限：seed 建立的 TEACHER 帶 CLASS scope，後台建立的帶 SCHOOL scope，兩種都要清掉。
      await tx.userRole.deleteMany({ where: { userId: id, role } });
      if (dropTeaching) {
        await tx.teacherAssignment.deleteMany({ where: { userId: id } });
      }
      if (dropGuardian) {
        await tx.guardianship.deleteMany({ where: { userId: id } });
      }
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'user.role_revoke',
        resourceType: 'User',
        resourceId: id,
        result: 'SUCCESS',
        // 只記數量與角色，不記班名/學生姓名（PII，修正 C）。
        metadata: {
          role,
          removedTeaching: dropTeaching ? target.teaching.length : 0,
          removedGuardianships: dropGuardian ? target.guardianOf.length : 0,
        },
      });
    });
    return this.getById(id);
  }

  private assertMayChangeOwnerRole(actor: UserActor, role: Role): void {
    if (role !== 'OWNER') {
      return;
    }
    if (!actor.roles.some((r) => r.role === 'OWNER')) {
      throw new ForbiddenException('owner_role_requires_owner');
    }
  }

  // 停用與刪除共用。錯誤碼由呼叫端給 —— 使用者看到的是「不能停用」還是「不能刪除」，
  // 那是兩句不同的話。
  private async assertNotLastActiveOwner(
    id: string,
    code = 'last_owner_cannot_be_disabled',
  ): Promise<void> {
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
      throw new BadRequestException(code);
    }
  }

  private actorRole(actor: UserActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
