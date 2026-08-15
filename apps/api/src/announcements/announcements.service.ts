import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type { AnnouncementScope, Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';

// 公告（docs/03）。發布權限：SCHOOL → OWNER/ADMIN;CLASS → OWNER/ADMIN 或 TEACHER 自班。
// 可見範圍：全校公告所有人可見;班級公告限該班老師 + 該班學生家長（+ OWNER/ADMIN 全可見）。
// 發布於同一 $transaction 寫 Announcement + OutboxEvent(AnnouncementPublished) + AuditLog;通知由 Worker 產生。
export interface AnnouncementActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface PublishAnnouncementInput {
  scope: AnnouncementScope;
  classId?: string;
  title: string;
  body: string;
}

export interface AnnouncementView {
  id: string;
  schoolId: string;
  classId: string | null;
  scope: AnnouncementScope;
  title: string;
  body: string;
  createdBy: string;
  createdAt: Date;
}

const ANNOUNCEMENT_VIEW = {
  id: true,
  schoolId: true,
  classId: true,
  scope: true,
  title: true,
  body: true,
  createdBy: true,
  createdAt: true,
} as const;

const EVENT = { AnnouncementPublished: 'AnnouncementPublished' } as const;

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // POST /announcements — 發布公告。
  async publish(actor: AnnouncementActor, input: PublishAnnouncementInput): Promise<AnnouncementView> {
    if (input.scope === 'CLASS' && !input.classId) {
      throw new BadRequestException('classId_required_for_class_scope');
    }

    const allowed = await this.canPublish(actor, input.scope, input.classId);
    if (!allowed) {
      throw new ForbiddenException('out_of_scope');
    }

    const school = await this.prisma.school.findFirst({ select: { id: true } });
    if (!school) {
      throw new BadRequestException('school_not_found');
    }
    const classId = input.scope === 'SCHOOL' ? null : (input.classId ?? null);

    return this.prisma.$transaction(async (tx) => {
      const announcement = await tx.announcement.create({
        data: {
          schoolId: school.id,
          classId,
          scope: input.scope,
          title: input.title,
          body: input.body,
          createdBy: actor.id,
        },
        select: ANNOUNCEMENT_VIEW,
      });

      await tx.outboxEvent.create({
        data: {
          eventType: EVENT.AnnouncementPublished,
          payload: {
            announcementId: announcement.id,
            schoolId: announcement.schoolId,
            classId: announcement.classId,
          } as Prisma.InputJsonValue,
        },
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'announcement.publish',
        resourceType: 'Announcement',
        resourceId: announcement.id,
        result: 'SUCCESS',
        metadata: { scope: input.scope, classId },
      });

      return announcement;
    });
  }

  // GET /announcements — 依使用者可見範圍：全校公告 + 自己相關班級的班級公告。
  async listForUser(actor: AnnouncementActor): Promise<AnnouncementView[]> {
    const roleNames = new Set(actor.roles.map((r) => r.role));

    // OWNER / ADMIN：全校皆可見。
    if (roleNames.has('OWNER') || roleNames.has('ADMIN')) {
      return this.prisma.announcement.findMany({
        select: ANNOUNCEMENT_VIEW,
        orderBy: { createdAt: 'desc' },
      });
    }

    const classIds = await this.relatedClassIds(actor);
    return this.prisma.announcement.findMany({
      where: { OR: [{ scope: 'SCHOOL' }, { classId: { in: classIds } }] },
      select: ANNOUNCEMENT_VIEW,
      orderBy: { createdAt: 'desc' },
    });
  }

  // 使用者相關的班級 id（老師任教班 + 家長小孩所在班）。
  private async relatedClassIds(actor: AnnouncementActor): Promise<string[]> {
    const roleNames = new Set(actor.roles.map((r) => r.role));
    const ids = new Set<string>();

    if (roleNames.has('TEACHER') || roleNames.has('BUS_TEACHER')) {
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: { userId: actor.id },
        select: { classId: true },
      });
      assignments.forEach((a) => ids.add(a.classId));
    }
    if (roleNames.has('PARENT') || roleNames.has('GUARDIAN')) {
      const guardianships = await this.prisma.guardianship.findMany({
        where: { userId: actor.id },
        select: { student: { select: { classId: true } } },
      });
      guardianships.forEach((g) => ids.add(g.student.classId));
    }
    return [...ids];
  }

  // 發布權限：SCHOOL → OWNER/ADMIN;CLASS → OWNER/ADMIN 或 TEACHER 自班。
  private async canPublish(
    actor: AnnouncementActor,
    scope: AnnouncementScope,
    classId: string | undefined,
  ): Promise<boolean> {
    const roleNames = new Set(actor.roles.map((r) => r.role));
    if (roleNames.has('OWNER') || roleNames.has('ADMIN')) {
      return true;
    }
    if (scope === 'CLASS' && classId && (roleNames.has('TEACHER') || roleNames.has('BUS_TEACHER'))) {
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: { userId: actor.id, classId },
        select: { id: true },
      });
      return Boolean(assignment);
    }
    return false;
  }

  private actorRole(actor: AnnouncementActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
