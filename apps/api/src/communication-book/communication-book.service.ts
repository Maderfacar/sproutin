import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type {
  HealthSymptom,
  MealAmount,
  Mood,
  NapQuality,
  PickupMethod,
  Prisma,
  ToiletState,
} from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { ScopeResolver } from '../auth/scope-resolver.service';
import { AuditService } from '../core/audit/audit.service';
import { AttendanceService } from '../attendance/attendance.service';
import { dayKey, todayKey } from '../events/day-key';

// 每日聯絡簿（Phase 9 階段2 刀4）。每生每日一列。
//
// 設計要點（Human Owner 定案 2026-08-17）：
//   - 老師以勾選為主；**所有欄位皆可留空**（未記錄），不強制必填。
//   - 出缺勤與請假不複製進本表，各自維持 SoT；本表只借 arrivalTime 記到校時刻。
//   - 「點名即到校」＝一個動作同時寫 Attendance 與 arrivalTime，於**同一交易**內完成。
//   - 老師只能填寫/修改近 7 天（EDIT_WINDOW_DAYS），避免事後改寫已交付家長的紀錄；
//     家長端可回溯查閱全部歷史（唯讀）。
//   - 家長只看得到**已送出**（publishedAt 非 null）的紀錄；校方看得到全部（含填寫中）。

const EDIT_WINDOW_DAYS = 7;
const MS_PER_DAY = 86_400_000;

const EVENT = { CommunicationBookPublished: 'CommunicationBookPublished' } as const;

export interface BookActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface SaveBookEntryInput {
  studentId: string;
  date: string;
  arrivalTime?: string | null;
  lunch?: MealAmount | null;
  snack?: MealAmount | null;
  nap?: NapQuality | null;
  toilet?: ToiletState | null;
  mood?: Mood | null;
  symptoms?: HealthSymptom[];
  temperature?: number | null;
  pickup?: PickupMethod | null;
  teacherNote?: string | null;
}

export interface CheckInInput {
  studentId: string;
  date: string;
  arrivalTime: string;
  status: 'PRESENT' | 'LATE';
}

export interface PublishInput {
  classId: string;
  date: string;
  pushStudentIds: string[];
}

// upsert 的 create/update 共用的可寫欄位（純量;不含 Prisma 的 FieldUpdateOperations 形狀）。
type BookWriteData = Partial<
  Pick<
    Prisma.CommunicationBookEntryUncheckedCreateInput,
    | 'arrivalTime'
    | 'lunch'
    | 'snack'
    | 'nap'
    | 'toilet'
    | 'mood'
    | 'symptoms'
    | 'temperature'
    | 'pickup'
    | 'teacherNote'
  >
>;

export interface BookEntryView {
  id: string;
  studentId: string;
  date: Date;
  arrivalTime: string | null;
  lunch: MealAmount | null;
  snack: MealAmount | null;
  nap: NapQuality | null;
  toilet: ToiletState | null;
  mood: Mood | null;
  symptoms: HealthSymptom[];
  temperature: number | null;
  pickup: PickupMethod | null;
  teacherNote: string | null;
  filledBy: string | null;
  filledAt: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
}

const ENTRY_SELECT = {
  id: true,
  studentId: true,
  date: true,
  arrivalTime: true,
  lunch: true,
  snack: true,
  nap: true,
  toilet: true,
  mood: true,
  symptoms: true,
  temperature: true,
  pickup: true,
  teacherNote: true,
  filledBy: true,
  filledAt: true,
  publishedAt: true,
  updatedAt: true,
} as const;

// 稽核 metadata 只記「動了哪些欄位」，**不記內容值**（姓名、留言、症狀皆屬 PII / 敏感，修正 C）。
const TRACKED_FIELDS: readonly (keyof SaveBookEntryInput)[] = [
  'arrivalTime',
  'lunch',
  'snack',
  'nap',
  'toilet',
  'mood',
  'symptoms',
  'temperature',
  'pickup',
  'teacherNote',
];

@Injectable()
export class CommunicationBookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeResolver,
    private readonly audit: AuditService,
    private readonly attendance: AttendanceService,
  ) {}

  // GET /communication-book?classId=&date=（校方整班）
  async listByClass(actor: BookActor, classId: string, date: string): Promise<BookEntryView[]> {
    const allowed = await this.scope.canManageClass(actor.id, actor.roles, classId);
    if (!allowed) throw new ForbiddenException('out_of_scope');

    return this.prisma.communicationBookEntry.findMany({
      where: { student: { classId }, date: dayKey(new Date(date)) },
      select: ENTRY_SELECT,
      orderBy: { studentId: 'asc' },
    });
  }

  // GET /communication-book?studentId=[&date=|&from=&to=]
  // 校方看得到填寫中的紀錄；家長只看得到已送出的（避免看到半成品）。
  async listByStudent(
    actor: BookActor,
    studentId: string,
    range: { date?: string; from?: string; to?: string },
  ): Promise<BookEntryView[]> {
    const allowed = await this.scope.canAccessStudent(actor.id, actor.roles, studentId);
    if (!allowed) throw new ForbiddenException('out_of_scope');

    const isStaff = await this.scope.canManageStudentClass(actor.id, actor.roles, studentId);

    return this.prisma.communicationBookEntry.findMany({
      where: {
        studentId,
        ...this.dateFilter(range),
        ...(isStaff ? {} : { publishedAt: { not: null } }),
      },
      select: ENTRY_SELECT,
      orderBy: { date: 'desc' },
    });
  }

  // PUT /communication-book — 老師填寫（每生每日 upsert）。未提供的欄位維持原值（局部更新）。
  async save(actor: BookActor, input: SaveBookEntryInput): Promise<BookEntryView> {
    const allowed = await this.scope.canManageStudentClass(actor.id, actor.roles, input.studentId);
    if (!allowed) throw new ForbiddenException('out_of_scope');

    const date = dayKey(new Date(input.date));
    this.assertWithinEditWindow(date);

    const data = this.toWriteData(input);
    const changed = TRACKED_FIELDS.filter((f) => input[f] !== undefined);

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.communicationBookEntry.upsert({
        where: { studentId_date: { studentId: input.studentId, date } },
        create: { studentId: input.studentId, date, ...data, filledBy: actor.id, filledAt: new Date() },
        update: { ...data, filledBy: actor.id, filledAt: new Date() },
        select: ENTRY_SELECT,
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'communication_book.save',
        resourceType: 'CommunicationBookEntry',
        resourceId: row.id,
        result: 'SUCCESS',
        metadata: { studentId: input.studentId, fields: changed },
      });
      return row;
    });
  }

  // POST /communication-book/check-in — 點名即到校。
  // 同一交易內：Attendance（沿用 AttendanceService，含 ADR-002 override 與 Outbox）+ 聯絡簿到校時間。
  async checkIn(actor: BookActor, input: CheckInInput): Promise<BookEntryView> {
    const allowed = await this.scope.canManageStudentClass(actor.id, actor.roles, input.studentId);
    if (!allowed) throw new ForbiddenException('out_of_scope');

    const date = dayKey(new Date(input.date));
    this.assertWithinEditWindow(date);

    return this.prisma.$transaction(async (tx) => {
      await this.attendance.markWithin(tx, actor, {
        studentId: input.studentId,
        date: date.toISOString(),
        status: input.status,
      });

      const row = await tx.communicationBookEntry.upsert({
        where: { studentId_date: { studentId: input.studentId, date } },
        create: {
          studentId: input.studentId,
          date,
          arrivalTime: input.arrivalTime,
          filledBy: actor.id,
          filledAt: new Date(),
        },
        update: { arrivalTime: input.arrivalTime, filledBy: actor.id, filledAt: new Date() },
        select: ENTRY_SELECT,
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'communication_book.check_in',
        resourceType: 'CommunicationBookEntry',
        resourceId: row.id,
        result: 'SUCCESS',
        metadata: { studentId: input.studentId, attendanceStatus: input.status },
      });
      return row;
    });
  }

  // POST /communication-book/publish — 一鍵送出全班當日紀錄。
  // 只送出「已有內容」的紀錄（沒填的不會憑空產生空白聯絡簿）；重複送出不會改寫既有送出時間。
  async publish(actor: BookActor, input: PublishInput): Promise<{ published: number; pushed: number }> {
    const allowed = await this.scope.canManageClass(actor.id, actor.roles, input.classId);
    if (!allowed) throw new ForbiddenException('out_of_scope');

    const date = dayKey(new Date(input.date));

    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.communicationBookEntry.findMany({
        where: { student: { classId: input.classId }, date, publishedAt: null },
        select: { id: true, studentId: true },
      });

      if (pending.length > 0) {
        await tx.communicationBookEntry.updateMany({
          where: { id: { in: pending.map((e) => e.id) } },
          data: { publishedAt: new Date() },
        });
      }

      const studentIds = pending.map((e) => e.studentId);
      // 推播名單限縮在本次實際送出的學生內（前端傳來的清單不信任）。
      const pushStudentIds = input.pushStudentIds.filter((id) => studentIds.includes(id));

      if (studentIds.length > 0) {
        await tx.outboxEvent.create({
          data: {
            eventType: EVENT.CommunicationBookPublished,
            payload: {
              classId: input.classId,
              date: date.toISOString(),
              studentIds,
              pushStudentIds,
            } as Prisma.InputJsonValue,
          },
        });
      }

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: this.actorRole(actor),
        action: 'communication_book.publish',
        resourceType: 'Class',
        resourceId: input.classId,
        result: 'SUCCESS',
        metadata: { date: date.toISOString(), published: studentIds.length, pushed: pushStudentIds.length },
      });

      return { published: studentIds.length, pushed: pushStudentIds.length };
    });
  }

  // 只有未提供（undefined）的欄位才略過；明確傳 null 代表清空該欄位。
  // 回傳純量形狀（非 UpdateInput），才能同時餵給 upsert 的 create 與 update。
  private toWriteData(input: SaveBookEntryInput): BookWriteData {
    const data: BookWriteData = {};
    if (input.arrivalTime !== undefined) data.arrivalTime = input.arrivalTime;
    if (input.lunch !== undefined) data.lunch = input.lunch;
    if (input.snack !== undefined) data.snack = input.snack;
    if (input.nap !== undefined) data.nap = input.nap;
    if (input.toilet !== undefined) data.toilet = input.toilet;
    if (input.mood !== undefined) data.mood = input.mood;
    if (input.symptoms !== undefined) data.symptoms = input.symptoms;
    if (input.temperature !== undefined) data.temperature = input.temperature;
    if (input.pickup !== undefined) data.pickup = input.pickup;
    if (input.teacherNote !== undefined) data.teacherNote = input.teacherNote;
    return data;
  }

  private dateFilter(range: { date?: string; from?: string; to?: string }): Prisma.CommunicationBookEntryWhereInput {
    if (range.date) return { date: dayKey(new Date(range.date)) };
    if (range.from || range.to) {
      return {
        date: {
          ...(range.from ? { gte: dayKey(new Date(range.from)) } : {}),
          ...(range.to ? { lte: dayKey(new Date(range.to)) } : {}),
        },
      };
    }
    return {};
  }

  // 老師只能填寫「今天起回推 7 天」的紀錄，且不能預填未來。
  private assertWithinEditWindow(date: Date): void {
    const today = todayKey();
    const diffDays = (today.getTime() - date.getTime()) / MS_PER_DAY;
    if (diffDays < 0) throw new BadRequestException('book_future_date');
    if (diffDays > EDIT_WINDOW_DAYS) throw new BadRequestException('book_edit_window_expired');
  }

  private actorRole(actor: BookActor): string | null {
    if (actor.roles.length === 0) return null;
    return actor.roles.map((r) => r.role).join(',');
  }
}
