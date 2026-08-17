import type { AuthUser } from '@sproutin/shared';
import type { BusDirection, BusRideSource, BusRideStatus } from '@sproutin/db';

// 娃娃車 / 接送（Phase 9 ⑦ 刀1）的共用型別。
// **door-to-door**：車開到每個孩子的家門口，所以是「接送點」（BusPoint）不是「站牌」。

export interface BusActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface BusPointView {
  id: string;
  routeId: string;
  name: string;
  address: string | null;
  orderAm: number;
  orderPm: number;
  etaAm: string | null;
  etaPm: string | null;
}

export interface BusRouteView {
  id: string;
  name: string;
  morningDepart: string | null;
  afternoonDepart: string | null;
  isActive: boolean;
  busTeacherId: string | null;
  afternoonCustomOrder: boolean;
  points: BusPointView[];
}

export interface BusAssignmentView {
  studentId: string;
  routeId: string;
  morningPointId: string | null;
  afternoonPointId: string | null;
  ridesMorning: boolean;
  ridesAfternoon: boolean;
}

export interface BusRideView {
  id: string;
  date: Date;
  studentId: string;
  routeId: string;
  direction: BusDirection;
  pointId: string | null;
  status: BusRideStatus;
  boardedAt: Date | null;
  alightedAt: Date | null;
  // 緯經度只在點上/下車當下抓一次，只進紀錄不參與計算；抓不到就是 null（不假裝有）。
  boardLat: number | null;
  boardLng: number | null;
  alightLat: number | null;
  alightLng: number | null;
  source: BusRideSource;
  recordedBy: string | null;
}

// 隨車老師的點名畫面要的一整包：名單（誰該搭、在哪一點）+ 當日紀錄。
// 一次給完，避免老師在車上為了湊資料連發三個請求。
export interface BusRosterEntry {
  studentId: string;
  studentName: string;
  classId: string;
  pointId: string | null;
  ride: BusRideView | null;
}

export interface BusRosterView {
  routeId: string;
  date: string;
  direction: BusDirection;
  points: BusPointView[];
  entries: BusRosterEntry[];
  // 今天請假、已自動移出名單的孩子數。老師看得到「有人被移走」才不會以為系統漏人。
  onLeaveCount: number;
}

// 家長端：一個孩子的今日乘車狀態（上下午各一筆，沒有就是 null）。
export interface MyBusView {
  studentId: string;
  date: string;
  routeName: string | null;
  morningDepart: string | null;
  afternoonDepart: string | null;
  ridesMorning: boolean;
  ridesAfternoon: boolean;
  morningPointName: string | null;
  afternoonPointName: string | null;
  morning: BusRideView | null;
  afternoon: BusRideView | null;
}

export const RIDE_SELECT = {
  id: true,
  date: true,
  studentId: true,
  routeId: true,
  direction: true,
  pointId: true,
  status: true,
  boardedAt: true,
  alightedAt: true,
  boardLat: true,
  boardLng: true,
  alightLat: true,
  alightLng: true,
  source: true,
  recordedBy: true,
} as const;

export const POINT_SELECT = {
  id: true,
  routeId: true,
  name: true,
  address: true,
  orderAm: true,
  orderPm: true,
  etaAm: true,
  etaPm: true,
} as const;

// 稽核 actorRole 的一致寫法（沿用聯絡簿 / 群發）。
export function actorRole(actor: BusActor): string | null {
  if (actor.roles.length === 0) return null;
  return actor.roles.map((r) => r.role).join(',');
}
