import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { BusDirection, BusRideStatus, Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { ScopeResolver } from '../auth/scope-resolver.service';
import { AuditService } from '../core/audit/audit.service';
import { dayKey } from '../events/day-key';
import {
  actorRole,
  BusActor,
  BusRideView,
  BusRosterEntry,
  BusRosterView,
  MyBusView,
  POINT_SELECT,
  RIDE_SELECT,
} from './bus.types';

// 隨車老師點名 + 家長今日狀態（Phase 9 ⑦ 刀1）。
//
// 設計主軸＝**一手扶車、一手點**：按鈕大、一次一件事、名單上不該出現的人就不要出現。
// 因此請假的孩子**不進名單**，只回一個數字讓畫面說明「有人被移走了」——
// 不說的話老師會以為系統漏人，然後自己去翻別的頁面確認，反而更慢。

export interface RosterQuery {
  routeId: string;
  date: string;
  direction: BusDirection;
}

type RideWriteData = Partial<
  Pick<
    Prisma.BusRideUncheckedCreateInput,
    'status' | 'boardedAt' | 'alightedAt' | 'boardLat' | 'boardLng' | 'alightLat' | 'alightLng'
  >
>;

export interface MarkInput {
  routeId: string;
  date: string;
  direction: BusDirection;
  studentIds: string[];
  // 只在老師按下的當下抓一次；抓不到就是 undefined，功能照常運作（Human Owner 定案）。
  lat?: number;
  lng?: number;
}

@Injectable()
export class BusRidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeResolver,
    private readonly audit: AuditService,
  ) {}

  // GET /bus/rides —— 點名畫面要的一整包（名單 + 接送點 + 當日紀錄）。
  async roster(actor: BusActor, query: RosterQuery): Promise<BusRosterView> {
    await this.assertCanManageRoute(actor, query.routeId);
    const date = dayKey(new Date(query.date));
    const isMorning = query.direction === 'MORNING';

    const points = await this.prisma.busPoint.findMany({
      where: { routeId: query.routeId },
      select: POINT_SELECT,
      orderBy: isMorning ? { orderAm: 'asc' } : { orderPm: 'asc' },
    });

    const assignments = await this.prisma.busAssignment.findMany({
      where: {
        routeId: query.routeId,
        ...(isMorning ? { ridesMorning: true } : { ridesAfternoon: true }),
        student: { status: 'ACTIVE' },
      },
      select: {
        studentId: true,
        morningPointId: true,
        afternoonPointId: true,
        student: { select: { name: true, classId: true } },
      },
    });

    const studentIds = assignments.map((a) => a.studentId);
    const rides = await this.prisma.busRide.findMany({
      where: { studentId: { in: studentIds }, date, direction: query.direction },
      select: RIDE_SELECT,
    });
    const rideByStudent = new Map(rides.map((r) => [r.studentId, r]));

    // 請假的孩子從名單移除。兩個來源都認：
    //   1. 請假核准事件寫下的 BusRide(ABSENT, source=LEAVE_EVENT) —— 正常路徑；
    //   2. 當日 Attendance 為 LEAVE/ABSENT —— 補網，涵蓋「先請假、之後才被排進娃娃車」
    //      這種事件當時還沒有名單可寫的情況（沿用聯絡簿老師端的同一條規則）。
    const away = await this.prisma.attendance.findMany({
      where: { studentId: { in: studentIds }, date, status: { in: ['LEAVE', 'ABSENT'] } },
      select: { studentId: true },
    });
    const awayIds = new Set(away.map((a) => a.studentId));
    for (const ride of rides) {
      if (ride.status === 'ABSENT' && ride.source === 'LEAVE_EVENT') awayIds.add(ride.studentId);
    }

    const entries: BusRosterEntry[] = assignments
      .filter((a) => !awayIds.has(a.studentId))
      .map((a) => ({
        studentId: a.studentId,
        studentName: a.student.name,
        classId: a.student.classId,
        pointId: isMorning ? a.morningPointId : a.afternoonPointId,
        ride: rideByStudent.get(a.studentId) ?? null,
      }));

    return {
      routeId: query.routeId,
      date: date.toISOString(),
      direction: query.direction,
      points,
      entries,
      onLeaveCount: assignments.filter((a) => awayIds.has(a.studentId)).length,
    };
  }

  // POST /bus/rides/board —— 上車（可一次多人，供「整個接送點一起上」使用）。
  async board(actor: BusActor, input: MarkInput): Promise<BusRideView[]> {
    return this.mark(actor, input, 'BOARDED');
  }

  // POST /bus/rides/alight —— 下車。上午到校時老師按一次「全部下車」即帶入全部 studentIds。
  async alight(actor: BusActor, input: MarkInput): Promise<BusRideView[]> {
    return this.mark(actor, input, 'ALIGHTED');
  }

  // POST /bus/rides/absent —— 今日未搭（家長自己載走、沒等到人）。
  async absent(actor: BusActor, input: MarkInput): Promise<BusRideView[]> {
    return this.mark(actor, input, 'ABSENT');
  }

  // POST /bus/rides/undo —— 點錯了，退回「待上車」。
  // 車在動的時候誤觸是必然會發生的事；沒有這條，老師只能留著一筆錯的紀錄。
  async undo(actor: BusActor, input: MarkInput): Promise<BusRideView[]> {
    return this.mark(actor, input, 'SCHEDULED');
  }

  // GET /me/bus?studentId= —— 家長看自己小孩的今日狀態。
  async myBus(actor: BusActor, studentId: string, dateIso?: string): Promise<MyBusView> {
    const allowed = await this.scope.canAccessStudent(actor.id, actor.roles, studentId);
    if (!allowed) throw new ForbiddenException('out_of_scope');

    const date = dayKey(dateIso ? new Date(dateIso) : new Date());
    const assignment = await this.prisma.busAssignment.findUnique({
      where: { studentId },
      include: {
        route: true,
        morningPoint: { select: { name: true } },
        afternoonPoint: { select: { name: true } },
      },
    });

    if (!assignment) {
      // 沒搭車不是錯誤，是一種正常狀態 —— 前端據此顯示「這個孩子沒有搭娃娃車」。
      return {
        studentId,
        date: date.toISOString(),
        routeName: null,
        morningDepart: null,
        afternoonDepart: null,
        ridesMorning: false,
        ridesAfternoon: false,
        morningPointName: null,
        afternoonPointName: null,
        morning: null,
        afternoon: null,
      };
    }

    const rides = await this.prisma.busRide.findMany({
      where: { studentId, date },
      select: RIDE_SELECT,
    });

    return {
      studentId,
      date: date.toISOString(),
      routeName: assignment.route.name,
      morningDepart: assignment.route.morningDepart,
      afternoonDepart: assignment.route.afternoonDepart,
      ridesMorning: assignment.ridesMorning,
      ridesAfternoon: assignment.ridesAfternoon,
      morningPointName: assignment.morningPoint?.name ?? null,
      afternoonPointName: assignment.afternoonPoint?.name ?? null,
      morning: rides.find((r) => r.direction === 'MORNING') ?? null,
      afternoon: rides.find((r) => r.direction === 'AFTERNOON') ?? null,
    };
  }

  // ---------- 內部 ----------

  // 每生每日每方向一列（@@unique + upsert，沿用 Attendance 的慣例）：
  // 重複點同一顆按鈕不會多出一列，也不會因為網路重送而產生兩筆矛盾的紀錄。
  private async mark(actor: BusActor, input: MarkInput, status: BusRideStatus): Promise<BusRideView[]> {
    await this.assertCanManageRoute(actor, input.routeId);
    if (input.studentIds.length === 0) throw new BadRequestException('student_ids_required');

    const date = dayKey(new Date(input.date));
    const isMorning = input.direction === 'MORNING';

    const assignments = await this.prisma.busAssignment.findMany({
      where: { studentId: { in: input.studentIds }, routeId: input.routeId },
      select: { studentId: true, morningPointId: true, afternoonPointId: true },
    });
    if (assignments.length !== input.studentIds.length) {
      // 前端傳來的名單不信任：不在這條路線名單上的孩子一律拒絕，
      // 否則點錯車就會在別條線的孩子身上留下紀錄。
      throw new BadRequestException('student_not_on_route');
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const rows: BusRideView[] = [];
      for (const assignment of assignments) {
        const pointId = isMorning ? assignment.morningPointId : assignment.afternoonPointId;
        const write = this.statusFields(status, now, input);
        rows.push(
          await tx.busRide.upsert({
            where: {
              studentId_date_direction: {
                studentId: assignment.studentId,
                date,
                direction: input.direction,
              },
            },
            create: {
              studentId: assignment.studentId,
              date,
              direction: input.direction,
              routeId: input.routeId,
              pointId,
              recordedBy: actor.id,
              // 老師手動記錄一律 MANUAL —— 之後請假被取消時不會被事件回滾掉
              // （與 Attendance 的 override 語意相同，ADR-002）。
              source: 'MANUAL',
              sourceRef: null,
              ...write,
            },
            update: { pointId, recordedBy: actor.id, source: 'MANUAL', sourceRef: null, ...write },
            select: RIDE_SELECT,
          }),
        );
      }

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: actorRole(actor),
        action: `bus.ride.${status.toLowerCase()}`,
        resourceType: 'BusRide',
        resourceId: input.routeId,
        result: 'SUCCESS',
        metadata: {
          date: date.toISOString(),
          direction: input.direction,
          count: rows.length,
          // 位置抓不到就明說沒有，不留白讓人以為系統壞了（Human Owner 定案）。
          hasLocation: input.lat !== undefined && input.lng !== undefined,
        },
      });
      return rows;
    });
  }

  // 回傳純量形狀（非 UpdateInput），才能同時餵給 upsert 的 create 與 update
  // —— 沿用聯絡簿 BookWriteData 的做法。
  private statusFields(status: BusRideStatus, now: Date, input: MarkInput): RideWriteData {
    const hasLocation = input.lat !== undefined && input.lng !== undefined;
    switch (status) {
      case 'BOARDED':
        return {
          status,
          boardedAt: now,
          boardLat: hasLocation ? input.lat : null,
          boardLng: hasLocation ? input.lng : null,
        };
      case 'ALIGHTED':
        return {
          status,
          alightedAt: now,
          alightLat: hasLocation ? input.lat : null,
          alightLng: hasLocation ? input.lng : null,
        };
      case 'ABSENT':
        return { status, boardedAt: null, alightedAt: null };
      default:
        // SCHEDULED＝復原誤觸：把時間與位置一併清掉，不留一筆「沒上車卻有上車時間」的紀錄。
        return {
          status: 'SCHEDULED',
          boardedAt: null,
          alightedAt: null,
          boardLat: null,
          boardLng: null,
          alightLat: null,
          alightLng: null,
        };
    }
  }

  // 路線層授權：OWNER/ADMIN 全部；BUS_TEACHER 只有被指派的那條車。
  // 前端只決定顯示，這裡才是真正的授權（Rule 5/6）。
  private async assertCanManageRoute(actor: BusActor, routeId: string): Promise<void> {
    const route = await this.prisma.busRoute.findUnique({
      where: { id: routeId },
      select: { id: true, busTeacherId: true },
    });
    if (!route) throw new NotFoundException('route_not_found');

    const roleNames = new Set(actor.roles.map((r) => r.role));
    if (roleNames.has('OWNER') || roleNames.has('ADMIN')) return;
    if (route.busTeacherId && route.busTeacherId === actor.id) return;
    throw new ForbiddenException('out_of_scope');
  }
}
