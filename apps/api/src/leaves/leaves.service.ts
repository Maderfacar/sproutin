import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type { LeaveStatus, Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { ScopeResolver } from '../auth/scope-resolver.service';
import { AuditService } from '../core/audit/audit.service';

// 請假動作的呼叫者（來自 JWT）。授權以此 + DB 為準（Rule 5/6）。
export interface LeaveActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface CreateLeaveInput {
  studentId: string;
  dateFrom: string; // ISO datetime
  dateTo: string; // ISO datetime
  reason: string;
}

export interface LeaveView {
  id: string;
  studentId: string;
  dateFrom: Date;
  dateTo: Date;
  reason: string;
  status: LeaveStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdBy: string;
  createdAt: Date;
}

const LEAVE_VIEW = {
  id: true,
  studentId: true,
  dateFrom: true,
  dateTo: true,
  reason: true,
  status: true,
  reviewedBy: true,
  reviewNote: true,
  createdBy: true,
  createdAt: true,
} as const;

// 事件型別字串（對齊 @sproutin/shared EventType;就地宣告避免 controller/service runtime 依賴 shared）。
const EVENT = {
  LeaveSubmitted: 'LeaveSubmitted',
  LeaveApproved: 'LeaveApproved',
  LeaveRejected: 'LeaveRejected',
  LeaveCancelled: 'LeaveCancelled',
} as const;

// Leave 狀態機（修正 A / docs/02 §4 / docs/06 §2 / docs/07 §4）。
//   - config-driven：SchoolConfig.leaveRequiresApproval 決定申請後進 PENDING 或直接 APPROVED。
//   - 每個狀態變更 = 同一 DB transaction 內：寫/改 Leave + 寫 OutboxEvent（PENDING，Step 3 消費）
//     + 寫 AuditLog（transactional audit，ADR-005 類別一）。三者原子。
//   - 授權（資料列級）在後端：申請看 canAccessStudent;審核/staff 取消看 canManageStudentClass;
//     家長取消限申請者本人（docs/05 §2 matrix）。
@Injectable()
export class LeavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeResolver,
    private readonly audit: AuditService,
  ) {}

  // POST /leaves — 申請請假。emit LeaveSubmitted（一律）;若免審核 → APPROVED + emit LeaveApproved。
  async create(actor: LeaveActor, input: CreateLeaveInput): Promise<LeaveView> {
    const allowed = await this.scope.canAccessStudent(actor.id, actor.roles, input.studentId);
    if (!allowed) {
      throw new ForbiddenException('out_of_scope');
    }

    const config = await this.prisma.schoolConfig.findFirst({
      select: { leaveRequiresApproval: true },
    });
    // 保守預設：查無 config 時視為需審核（避免誤自動核准）。
    const requiresApproval = config?.leaveRequiresApproval ?? true;
    const status: LeaveStatus = requiresApproval ? 'PENDING' : 'APPROVED';

    return this.prisma.$transaction(async (tx) => {
      const leave = await tx.leave.create({
        data: {
          studentId: input.studentId,
          dateFrom: new Date(input.dateFrom),
          dateTo: new Date(input.dateTo),
          reason: input.reason,
          status,
          createdBy: actor.id,
        },
        select: LEAVE_VIEW,
      });

      await this.emit(tx, EVENT.LeaveSubmitted, {
        leaveId: leave.id,
        studentId: leave.studentId,
        dateFrom: leave.dateFrom.toISOString(),
        dateTo: leave.dateTo.toISOString(),
        requiresApproval,
      });

      // 免審核 → 申請即生效，同交易再發 LeaveApproved（Step 2/3 投影 Attendance）。
      if (!requiresApproval) {
        await this.emit(tx, EVENT.LeaveApproved, {
          leaveId: leave.id,
          studentId: leave.studentId,
          dateFrom: leave.dateFrom.toISOString(),
          dateTo: leave.dateTo.toISOString(),
        });
      }

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'leave.submit',
        resourceType: 'Leave',
        resourceId: leave.id,
        result: 'SUCCESS',
        metadata: { status, requiresApproval },
      });

      return leave;
    });
  }

  // GET /leaves?studentId= — 該學生的請假紀錄（scope 過濾）。
  async listForStudent(actor: LeaveActor, studentId: string): Promise<LeaveView[]> {
    const allowed = await this.scope.canAccessStudent(actor.id, actor.roles, studentId);
    if (!allowed) {
      throw new ForbiddenException('out_of_scope');
    }
    return this.prisma.leave.findMany({
      where: { studentId },
      select: LEAVE_VIEW,
      orderBy: { createdAt: 'desc' },
    });
  }

  // GET /leaves?classId=&status= — 整班請假紀錄（老師審核用，Step 7c）。班級管理者限定。
  async listForClass(
    actor: LeaveActor,
    classId: string,
    status?: LeaveStatus,
  ): Promise<LeaveView[]> {
    const allowed = await this.scope.canManageClass(actor.id, actor.roles, classId);
    if (!allowed) {
      throw new ForbiddenException('out_of_scope');
    }
    return this.prisma.leave.findMany({
      where: { student: { classId }, ...(status ? { status } : {}) },
      select: LEAVE_VIEW,
      orderBy: { createdAt: 'desc' },
    });
  }

  // PATCH /leaves/:id/status — 審核 approve/reject（僅 PENDING 可審核）。班級管理者（TEACHER 自班 / ADMIN）。
  async setStatus(
    actor: LeaveActor,
    leaveId: string,
    next: 'APPROVED' | 'REJECTED',
    reviewNote?: string,
  ): Promise<LeaveView> {
    const leave = await this.prisma.leave.findUnique({
      where: { id: leaveId },
      select: { id: true, studentId: true, status: true },
    });
    if (!leave) {
      throw new NotFoundException('leave_not_found');
    }

    const allowed = await this.scope.canManageStudentClass(actor.id, actor.roles, leave.studentId);
    if (!allowed) {
      throw new ForbiddenException('out_of_scope');
    }

    // 狀態機：僅 PENDING 可審核。其餘（APPROVED/REJECTED/CANCELLED）→ 非法轉移。
    if (leave.status !== 'PENDING') {
      throw new ConflictException('LEAVE_INVALID_TRANSITION');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.leave.update({
        where: { id: leaveId },
        data: { status: next, reviewedBy: actor.id, reviewNote: reviewNote ?? undefined },
        select: LEAVE_VIEW,
      });

      if (next === 'APPROVED') {
        await this.emit(tx, EVENT.LeaveApproved, {
          leaveId: updated.id,
          studentId: updated.studentId,
          dateFrom: updated.dateFrom.toISOString(),
          dateTo: updated.dateTo.toISOString(),
        });
      } else {
        await this.emit(tx, EVENT.LeaveRejected, {
          leaveId: updated.id,
          studentId: updated.studentId,
          reason: reviewNote ?? undefined,
        });
      }

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: next === 'APPROVED' ? 'leave.approve' : 'leave.reject',
        resourceType: 'Leave',
        resourceId: updated.id,
        result: 'SUCCESS',
        metadata: { from: 'PENDING', to: next },
      });

      return updated;
    });
  }

  // PATCH /leaves/:id/cancel — 取消（PENDING|APPROVED 可取消）。申請者本人 / 班級管理者。
  async cancel(actor: LeaveActor, leaveId: string): Promise<LeaveView> {
    const leave = await this.prisma.leave.findUnique({
      where: { id: leaveId },
      select: { id: true, studentId: true, status: true, createdBy: true },
    });
    if (!leave) {
      throw new NotFoundException('leave_not_found');
    }

    // 授權：申請者本人可取消自己的申請;否則須為班級管理者（TEACHER 自班 / ADMIN / OWNER）。
    const isApplicant = leave.createdBy === actor.id;
    const isStaff = isApplicant
      ? false
      : await this.scope.canManageStudentClass(actor.id, actor.roles, leave.studentId);
    if (!isApplicant && !isStaff) {
      throw new ForbiddenException('out_of_scope');
    }

    // 狀態機：僅 PENDING / APPROVED 可取消。REJECTED / CANCELLED → 非法轉移。
    if (leave.status !== 'PENDING' && leave.status !== 'APPROVED') {
      throw new ConflictException('LEAVE_INVALID_TRANSITION');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.leave.update({
        where: { id: leaveId },
        data: { status: 'CANCELLED' },
        select: LEAVE_VIEW,
      });

      await this.emit(tx, EVENT.LeaveCancelled, {
        leaveId: updated.id,
        studentId: updated.studentId,
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'leave.cancel',
        resourceType: 'Leave',
        resourceId: updated.id,
        result: 'SUCCESS',
        metadata: { from: leave.status, to: 'CANCELLED', byApplicant: isApplicant },
      });

      return updated;
    });
  }

  // 於同一交易寫入 Transactional Outbox（PENDING）。Worker dispatcher（Step 3）稍後消費。
  private async emit(
    tx: Prisma.TransactionClient,
    eventType: (typeof EVENT)[keyof typeof EVENT],
    payload: Record<string, unknown>,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: { eventType, payload: payload as Prisma.InputJsonValue },
    });
  }

  // 稽核用「當下角色」摘要（AuditLog.actorRole 為單一字串）;多角色以逗號串接保留資訊。
  private actorRole(actor: LeaveActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
