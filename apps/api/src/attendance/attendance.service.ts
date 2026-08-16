import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type { AttendanceStatus, AttendanceSource, Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { ScopeResolver } from '../auth/scope-resolver.service';
import { AuditService } from '../core/audit/audit.service';

export interface AttendanceActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface MarkAttendanceInput {
  studentId: string;
  date: string; // ISO datetime（每日一列，@@unique([studentId,date])）
  status: AttendanceStatus;
}

export interface AttendanceView {
  id: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  source: AttendanceSource;
  sourceRef: string | null;
  derivedFrom: string | null;
  overriddenAt: Date | null;
  overriddenBy: string | null;
}

const ATTENDANCE_VIEW = {
  id: true,
  studentId: true,
  date: true,
  status: true,
  source: true,
  sourceRef: true,
  derivedFrom: true,
  overriddenAt: true,
  overriddenBy: true,
} as const;

const EVENT = { AttendanceMarked: 'AttendanceMarked' } as const;

// Attendance（混合 SoT/Derived，ADR-002 / docs/02 §4a-4b）。
//   - 手動標記 source=MANUAL（SoT）;LeaveApproved 投影 source=LEAVE_EVENT（Derived）由 Step 3 Worker 產生。
//   - **Override（本步核心，ADR-002 rule 4）**：老師人工修改一筆 source=LEAVE_EVENT 的列 →
//     所有權轉 MANUAL、記 overriddenAt/overriddenBy、保留 derivedFrom（血緣）;之後事件回滾不觸碰此列（Step 3）。
//   - 每個變更於同一 $transaction 寫 Attendance + OutboxEvent(AttendanceMarked) + AuditLog（transactional）。
@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeResolver,
    private readonly audit: AuditService,
  ) {}

  // GET /attendance?classId=&date= （staff 班級視圖）或 ?studentId= （家長/該生視圖）。
  async list(
    actor: AttendanceActor,
    query: { classId?: string; studentId?: string; date?: string },
  ): Promise<AttendanceView[]> {
    const dateFilter = query.date ? { date: new Date(query.date) } : {};

    if (query.studentId) {
      const allowed = await this.scope.canAccessStudent(actor.id, actor.roles, query.studentId);
      if (!allowed) throw new ForbiddenException('out_of_scope');
      return this.prisma.attendance.findMany({
        where: { studentId: query.studentId, ...dateFilter },
        select: ATTENDANCE_VIEW,
        orderBy: { date: 'desc' },
      });
    }

    if (query.classId) {
      const allowed = await this.canManageClass(actor, query.classId);
      if (!allowed) throw new ForbiddenException('out_of_scope');
      return this.prisma.attendance.findMany({
        where: { student: { classId: query.classId }, ...dateFilter },
        select: ATTENDANCE_VIEW,
        orderBy: [{ date: 'desc' }, { studentId: 'asc' }],
      });
    }

    throw new ForbiddenException('classId_or_studentId_required');
  }

  // POST /attendance — 手動標記（source=MANUAL）;每日一列 upsert。
  // 若當日已有 source=LEAVE_EVENT 列 → 亦視為 override（所有權轉 MANUAL）。
  async mark(actor: AttendanceActor, input: MarkAttendanceInput): Promise<AttendanceView> {
    const allowed = await this.scope.canManageStudentClass(actor.id, actor.roles, input.studentId);
    if (!allowed) throw new ForbiddenException('out_of_scope');

    return this.prisma.$transaction((tx) => this.markWithin(tx, actor, input));
  }

  // mark() 的交易內主體。**呼叫端必須已完成 scope 檢查**（本方法不重複驗證）。
  // 抽出的原因：每日聯絡簿的「點名即到校」要在同一個交易裡同時寫出缺勤與到校時間
  // （Human Owner 決策 2026-08-17：老師一個動作完成兩件事），若各自開交易會有半套失敗的風險。
  async markWithin(
    tx: Prisma.TransactionClient,
    actor: AttendanceActor,
    input: MarkAttendanceInput,
  ): Promise<AttendanceView> {
    const date = new Date(input.date);

    const existing = await tx.attendance.findUnique({
      where: { studentId_date: { studentId: input.studentId, date } },
      select: { id: true, source: true, sourceRef: true, derivedFrom: true },
    });

    const write = this.computeWrite(existing, input.status, actor.id);
    const row = existing
      ? await tx.attendance.update({ where: { id: existing.id }, data: write.data, select: ATTENDANCE_VIEW })
      : await tx.attendance.create({
          data: { studentId: input.studentId, date, status: input.status, source: 'MANUAL' },
          select: ATTENDANCE_VIEW,
        });

    await this.emitMarked(tx, row);
    await this.audit.record(tx, {
      actorUserId: actor.id,
      actorRole: this.actorRole(actor),
      action: write.wasOverride ? 'attendance.override' : 'attendance.mark',
      resourceType: 'Attendance',
      resourceId: row.id,
      result: 'SUCCESS',
      metadata: { status: input.status, source: row.source, wasOverride: write.wasOverride },
    });
    return row;
  }

  // PATCH /attendance/:id — 修改;若原為 source=LEAVE_EVENT → override（ADR-002 rule 4）。
  async update(actor: AttendanceActor, id: string, status: AttendanceStatus): Promise<AttendanceView> {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
      select: { id: true, studentId: true, source: true, sourceRef: true, derivedFrom: true },
    });
    if (!existing) throw new NotFoundException('attendance_not_found');

    const allowed = await this.scope.canManageStudentClass(actor.id, actor.roles, existing.studentId);
    if (!allowed) throw new ForbiddenException('out_of_scope');

    const write = this.computeWrite(existing, status, actor.id);

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.attendance.update({
        where: { id },
        data: write.data,
        select: ATTENDANCE_VIEW,
      });
      await this.emitMarked(tx, row);
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: write.wasOverride ? 'attendance.override' : 'attendance.update',
        resourceType: 'Attendance',
        resourceId: row.id,
        result: 'SUCCESS',
        metadata: { status, source: row.source, wasOverride: write.wasOverride },
      });
      return row;
    });
  }

  // 計算寫入資料 + 是否為 override。傳入 existing=null 代表新建（呼叫端改走 create）。
  private computeWrite(
    existing: { source: AttendanceSource; sourceRef: string | null; derivedFrom: string | null } | null,
    status: AttendanceStatus,
    actorId: string,
  ): { data: Prisma.AttendanceUpdateInput; wasOverride: boolean } {
    if (existing && existing.source === 'LEAVE_EVENT') {
      // Override：Derived → MANUAL;保留血緣（derivedFrom），清 active sourceRef，記錄覆寫者/時間。
      return {
        data: {
          status,
          source: 'MANUAL',
          sourceRef: null,
          derivedFrom: existing.derivedFrom ?? existing.sourceRef ?? null,
          overriddenAt: new Date(),
          overriddenBy: actorId,
        },
        wasOverride: true,
      };
    }
    // 既有 MANUAL 列或（create 前的）預設：只改狀態（create 由呼叫端處理）。
    return { data: { status }, wasOverride: false };
  }

  // staff 能否管理該班（OWNER/ADMIN 全校;TEACHER/BUS_TEACHER 自班）。
  private async canManageClass(actor: AttendanceActor, classId: string): Promise<boolean> {
    const roleNames = new Set(actor.roles.map((r) => r.role));
    if (roleNames.has('OWNER') || roleNames.has('ADMIN')) return true;
    if (roleNames.has('TEACHER') || roleNames.has('BUS_TEACHER')) {
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: { userId: actor.id, classId },
        select: { id: true },
      });
      if (assignment) return true;
    }
    return false;
  }

  private async emitMarked(tx: Prisma.TransactionClient, row: AttendanceView): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        eventType: EVENT.AttendanceMarked,
        payload: {
          studentId: row.studentId,
          date: row.date.toISOString(),
          status: row.status,
        } as Prisma.InputJsonValue,
      },
    });
  }

  private actorRole(actor: AttendanceActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
