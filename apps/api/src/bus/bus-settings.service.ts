import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';
import {
  actorRole,
  BusActor,
  BusAssignmentView,
  BusPointView,
  BusRouteView,
  POINT_SELECT,
} from './bus.types';

// 娃娃車設定（OWNER/ADMIN）：路線、接送點、固定名單。
//
// 兩層刻意分開（Human Owner 定案）：
//   路線與接送點 = 全園共用的骨架（本 service 的前兩段）
//   哪個孩子搭哪一班、在哪裡上下車 = 學生的屬性（BusAssignment）
// door-to-door 之下一個接送點通常就是一戶人家，但仍需獨立存在：兄弟姊妹共用一點、
// 「早上在自己家上車、下午送到阿嬤家」都要表達得出來。
//
// 下午順序：預設是上午的倒序（車子原路開回去）。園長一旦手動排過下午，
// route.afternoonCustomOrder 轉 true，之後新增接送點不再自動重排 ——
// 否則他排好的例外會被默默沖掉。

export interface SaveRouteInput {
  name: string;
  morningDepart?: string | null;
  afternoonDepart?: string | null;
  isActive?: boolean;
  busTeacherId?: string | null;
}

export interface SavePointInput {
  routeId: string;
  name: string;
  address?: string | null;
  etaAm?: string | null;
  etaPm?: string | null;
}

export interface UpdatePointInput {
  name?: string;
  address?: string | null;
  etaAm?: string | null;
  etaPm?: string | null;
}

export interface ReorderInput {
  routeId: string;
  direction: 'MORNING' | 'AFTERNOON';
  pointIds: string[];
}

export interface SaveAssignmentInput {
  studentId: string;
  routeId: string;
  morningPointId?: string | null;
  afternoonPointId?: string | null;
  ridesMorning?: boolean;
  ridesAfternoon?: boolean;
}

@Injectable()
export class BusSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------- 路線 ----------

  // GET /bus/routes —— 一次帶回接送點（設定頁與點名頁都需要，分兩次查沒有意義）。
  // BUS_TEACHER 只拿得到自己被指派的路線（列表層先濾；寫入層另有 Guard）。
  async listRoutes(actor: BusActor): Promise<BusRouteView[]> {
    const roleNames = new Set(actor.roles.map((r) => r.role));
    const isManager = roleNames.has('OWNER') || roleNames.has('ADMIN');

    const routes = await this.prisma.busRoute.findMany({
      where: isManager ? {} : { busTeacherId: actor.id, isActive: true },
      include: { points: { select: POINT_SELECT, orderBy: { orderAm: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    return routes.map((r) => ({
      id: r.id,
      name: r.name,
      morningDepart: r.morningDepart,
      afternoonDepart: r.afternoonDepart,
      isActive: r.isActive,
      busTeacherId: r.busTeacherId,
      afternoonCustomOrder: r.afternoonCustomOrder,
      points: r.points,
    }));
  }

  async createRoute(actor: BusActor, input: SaveRouteInput): Promise<BusRouteView> {
    return this.prisma.$transaction(async (tx) => {
      const route = await tx.busRoute.create({
        data: {
          name: input.name,
          morningDepart: input.morningDepart ?? null,
          afternoonDepart: input.afternoonDepart ?? null,
          isActive: input.isActive ?? true,
          busTeacherId: input.busTeacherId ?? null,
        },
      });
      await this.record(tx, actor, 'bus.route.create', route.id, { name: route.name });
      return { ...route, points: [] };
    });
  }

  async updateRoute(actor: BusActor, id: string, input: Partial<SaveRouteInput>): Promise<BusRouteView> {
    await this.mustFindRoute(id);
    return this.prisma.$transaction(async (tx) => {
      const route = await tx.busRoute.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.morningDepart !== undefined ? { morningDepart: input.morningDepart } : {}),
          ...(input.afternoonDepart !== undefined ? { afternoonDepart: input.afternoonDepart } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.busTeacherId !== undefined ? { busTeacherId: input.busTeacherId } : {}),
        },
        include: { points: { select: POINT_SELECT, orderBy: { orderAm: 'asc' } } },
      });
      await this.record(tx, actor, 'bus.route.update', id, { fields: Object.keys(input) });
      return route;
    });
  }

  // 刪除路線：**已經有乘車紀錄的不給刪**，請改停用。
  // 刪掉的話那些孩子哪天搭了車就永遠查不到了 —— 爭議時這正是要拿出來的東西。
  async deleteRoute(actor: BusActor, id: string): Promise<{ deleted: true }> {
    await this.mustFindRoute(id);
    const rides = await this.prisma.busRide.count({ where: { routeId: id } });
    if (rides > 0) throw new BadRequestException('route_has_rides');

    return this.prisma.$transaction(async (tx) => {
      await tx.busAssignment.deleteMany({ where: { routeId: id } });
      await tx.busPoint.deleteMany({ where: { routeId: id } });
      await tx.busRoute.delete({ where: { id } });
      await this.record(tx, actor, 'bus.route.delete', id, {});
      return { deleted: true as const };
    });
  }

  // ---------- 接送點 ----------

  async createPoint(actor: BusActor, input: SavePointInput): Promise<BusPointView> {
    const route = await this.mustFindRoute(input.routeId);

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.busPoint.count({ where: { routeId: input.routeId } });
      const point = await tx.busPoint.create({
        data: {
          routeId: input.routeId,
          name: input.name,
          address: input.address ?? null,
          etaAm: input.etaAm ?? null,
          etaPm: input.etaPm ?? null,
          orderAm: count,
          // 尚未手動排過下午時 orderPm 會在下面整條重算；已手動排過就接在最後，不動他排好的。
          orderPm: count,
        },
        select: POINT_SELECT,
      });
      if (!route.afternoonCustomOrder) {
        await this.syncAfternoonOrder(tx, input.routeId);
      }
      await this.record(tx, actor, 'bus.point.create', point.id, { routeId: input.routeId });
      return tx.busPoint.findUniqueOrThrow({ where: { id: point.id }, select: POINT_SELECT });
    });
  }

  async updatePoint(actor: BusActor, id: string, input: UpdatePointInput): Promise<BusPointView> {
    const existing = await this.prisma.busPoint.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('point_not_found');

    return this.prisma.$transaction(async (tx) => {
      const point = await tx.busPoint.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.etaAm !== undefined ? { etaAm: input.etaAm } : {}),
          ...(input.etaPm !== undefined ? { etaPm: input.etaPm } : {}),
        },
        select: POINT_SELECT,
      });
      await this.record(tx, actor, 'bus.point.update', id, { fields: Object.keys(input) });
      return point;
    });
  }

  // 刪除接送點：還有孩子掛在上面就不給刪，並明講「還有幾個孩子」。
  // 直接刪的話那些孩子會變成「有搭車但不知道在哪上車」，隨車老師名單上就會出現孤兒。
  async deletePoint(actor: BusActor, id: string): Promise<{ deleted: true }> {
    const point = await this.prisma.busPoint.findUnique({
      where: { id },
      select: { id: true, routeId: true },
    });
    if (!point) throw new NotFoundException('point_not_found');

    const inUse = await this.prisma.busAssignment.count({
      where: { OR: [{ morningPointId: id }, { afternoonPointId: id }] },
    });
    if (inUse > 0) throw new BadRequestException('point_in_use');

    const route = await this.mustFindRoute(point.routeId);
    return this.prisma.$transaction(async (tx) => {
      await tx.busPoint.delete({ where: { id } });
      await this.renumber(tx, point.routeId, route.afternoonCustomOrder);
      await this.record(tx, actor, 'bus.point.delete', id, { routeId: point.routeId });
      return { deleted: true as const };
    });
  }

  // 重排順序。上午重排時，若園長還沒手動排過下午，下午跟著自動倒過來。
  // 下午重排 → afternoonCustomOrder 轉 true，從此下午自己走自己的。
  async reorderPoints(actor: BusActor, input: ReorderInput): Promise<BusPointView[]> {
    const route = await this.mustFindRoute(input.routeId);
    const points = await this.prisma.busPoint.findMany({
      where: { routeId: input.routeId },
      select: { id: true },
    });
    const known = new Set(points.map((p) => p.id));
    if (input.pointIds.length !== points.length || input.pointIds.some((id) => !known.has(id))) {
      throw new BadRequestException('point_order_mismatch');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const [index, pointId] of input.pointIds.entries()) {
        await tx.busPoint.update({
          where: { id: pointId },
          data: input.direction === 'MORNING' ? { orderAm: index } : { orderPm: index },
        });
      }
      if (input.direction === 'MORNING' && !route.afternoonCustomOrder) {
        await this.syncAfternoonOrder(tx, input.routeId);
      }
      if (input.direction === 'AFTERNOON' && !route.afternoonCustomOrder) {
        await tx.busRoute.update({
          where: { id: input.routeId },
          data: { afternoonCustomOrder: true },
        });
      }
      await this.record(tx, actor, 'bus.point.reorder', input.routeId, { direction: input.direction });
      return tx.busPoint.findMany({
        where: { routeId: input.routeId },
        select: POINT_SELECT,
        orderBy: { orderAm: 'asc' },
      });
    });
  }

  // ---------- 固定名單 ----------

  async listAssignments(routeId?: string): Promise<BusAssignmentView[]> {
    return this.prisma.busAssignment.findMany({
      where: routeId ? { routeId } : {},
      select: {
        studentId: true,
        routeId: true,
        morningPointId: true,
        afternoonPointId: true,
        ridesMorning: true,
        ridesAfternoon: true,
      },
    });
  }

  // PUT /bus/assignments —— 一個學生一列（upsert）。
  // 接送點必須屬於同一條路線，否則點名畫面會出現「在別條線的點上車」這種不可能的資料。
  async saveAssignment(actor: BusActor, input: SaveAssignmentInput): Promise<BusAssignmentView> {
    await this.mustFindRoute(input.routeId);
    await this.assertPointBelongsToRoute(input.morningPointId, input.routeId);
    await this.assertPointBelongsToRoute(input.afternoonPointId, input.routeId);

    const data = {
      routeId: input.routeId,
      morningPointId: input.morningPointId ?? null,
      afternoonPointId: input.afternoonPointId ?? null,
      ridesMorning: input.ridesMorning ?? true,
      ridesAfternoon: input.ridesAfternoon ?? true,
    };

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.busAssignment.upsert({
        where: { studentId: input.studentId },
        create: { studentId: input.studentId, ...data },
        update: data,
        select: {
          studentId: true,
          routeId: true,
          morningPointId: true,
          afternoonPointId: true,
          ridesMorning: true,
          ridesAfternoon: true,
        },
      });
      await this.record(tx, actor, 'bus.assignment.save', input.studentId, {
        routeId: input.routeId,
        ridesMorning: data.ridesMorning,
        ridesAfternoon: data.ridesAfternoon,
      });
      return row;
    });
  }

  // 取消搭車：只刪固定名單，已發生的乘車紀錄留著（那是歷史事實）。
  async removeAssignment(actor: BusActor, studentId: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.busAssignment.findUnique({
      where: { studentId },
      select: { studentId: true },
    });
    if (!existing) throw new NotFoundException('assignment_not_found');

    return this.prisma.$transaction(async (tx) => {
      await tx.busAssignment.delete({ where: { studentId } });
      await this.record(tx, actor, 'bus.assignment.remove', studentId, {});
      return { deleted: true as const };
    });
  }

  // ---------- 內部 ----------

  private async mustFindRoute(id: string) {
    const route = await this.prisma.busRoute.findUnique({ where: { id } });
    if (!route) throw new NotFoundException('route_not_found');
    return route;
  }

  private async assertPointBelongsToRoute(pointId: string | null | undefined, routeId: string): Promise<void> {
    if (!pointId) return;
    const point = await this.prisma.busPoint.findUnique({
      where: { id: pointId },
      select: { routeId: true },
    });
    if (!point || point.routeId !== routeId) throw new BadRequestException('point_not_on_route');
  }

  // 下午 = 上午的倒序。只在 afternoonCustomOrder 為 false 時呼叫。
  private async syncAfternoonOrder(tx: Prisma.TransactionClient, routeId: string): Promise<void> {
    const points = await tx.busPoint.findMany({
      where: { routeId },
      select: { id: true },
      orderBy: { orderAm: 'asc' },
    });
    const last = points.length - 1;
    for (const [index, point] of points.entries()) {
      await tx.busPoint.update({ where: { id: point.id }, data: { orderPm: last - index } });
    }
  }

  // 刪掉一個點之後把序號補回連續（0,1,2…），避免久了變成 0,3,7 這種看不懂的值。
  private async renumber(
    tx: Prisma.TransactionClient,
    routeId: string,
    afternoonCustomOrder: boolean,
  ): Promise<void> {
    const byAm = await tx.busPoint.findMany({
      where: { routeId },
      select: { id: true },
      orderBy: { orderAm: 'asc' },
    });
    for (const [index, point] of byAm.entries()) {
      await tx.busPoint.update({ where: { id: point.id }, data: { orderAm: index } });
    }
    if (afternoonCustomOrder) {
      const byPm = await tx.busPoint.findMany({
        where: { routeId },
        select: { id: true },
        orderBy: { orderPm: 'asc' },
      });
      for (const [index, point] of byPm.entries()) {
        await tx.busPoint.update({ where: { id: point.id }, data: { orderPm: index } });
      }
      return;
    }
    await this.syncAfternoonOrder(tx, routeId);
  }

  private async record(
    tx: Prisma.TransactionClient,
    actor: BusActor,
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    // 稽核 metadata 不存 PII：路線與接送點名稱不含個資，但學生姓名絕不進來（只記 id）。
    await this.audit.record(tx, {
      actorUserId: actor.id,
      actorRole: actorRole(actor),
      action,
      resourceType: 'Bus',
      resourceId,
      result: 'SUCCESS',
      metadata,
    });
  }
}
