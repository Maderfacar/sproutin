// 前端消費後端回應的型別。後端以 Prisma select 回傳原始物件（非信封），
// Date 欄位經 JSON 序列化為 ISO 字串。

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveView {
  id: string;
  studentId: string;
  dateFrom: string; // ISO
  dateTo: string; // ISO
  reason: string;
  status: LeaveStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdBy: string;
  createdAt: string; // ISO
}

export interface CreateLeaveBody {
  studentId: string;
  dateFrom: string; // ISO datetime
  dateTo: string; // ISO datetime
  reason: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'LATE';
export type AttendanceSource = 'MANUAL' | 'LEAVE_EVENT';

export interface AttendanceView {
  id: string;
  studentId: string;
  date: string; // ISO
  status: AttendanceStatus;
  source: AttendanceSource;
  sourceRef: string | null;
  derivedFrom: string | null;
  overriddenAt: string | null;
  overriddenBy: string | null;
}

export type MessageCategory = 'GENERAL' | 'HEALTH' | 'BEHAVIOR' | 'ADMIN';

export interface MessageView {
  id: string;
  studentId: string;
  classId: string;
  senderId: string;
  // 發話者是誰。後端只保證給「事實」（姓名 + 對這個學生的身分），中文由前端的
  // RELATION_LABEL / ROLE_LABEL 決定。同時是校方又是這個孩子的家長時，後端給的是家長身分。
  senderName: string;
  senderRelation: GuardianRelation | null; // 家長／監護人才有
  senderRole: UserRoleName | null; // 校方身分；家長為 null
  category: MessageCategory;
  body: string;
  createdAt: string; // ISO
  isRead: boolean;
}

export interface SendMessageBody {
  studentId: string;
  category?: MessageCategory;
  body: string;
}

export interface NotificationView {
  id: string;
  type: string;
  payload: unknown;
  readAt: string | null;
  createdAt: string; // ISO
}

export interface ClassView {
  id: string;
  name: string;
  studentCount: number;
}

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED';

export interface AdminStudentView {
  id: string;
  name: string;
  classId: string;
  status: StudentStatus;
}

export interface StudentDetailView extends AdminStudentView {
  className: string;
  guardians: {
    userId: string;
    displayName: string;
    relation: GuardianRelation;
    isPrimary: boolean;
  }[];
}

export interface CreateStudentBody {
  name: string;
  classId: string;
}

export type UserRoleName = 'OWNER' | 'ADMIN' | 'TEACHER' | 'BUS_TEACHER' | 'PARENT' | 'GUARDIAN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type GuardianRelation = 'FATHER' | 'MOTHER' | 'GRANDPARENT' | 'GUARDIAN';

export interface UserView {
  id: string;
  displayName: string;
  status: UserStatus;
  hasLineLinked: boolean;
  roles: { role: UserRoleName; scopeType: string; scopeId: string | null }[];
  guardianOf: {
    id: string;
    studentId: string;
    studentName: string;
    relation: GuardianRelation;
    isPrimary: boolean;
  }[];
  teaching: { id: string; classId: string; className: string }[];
}

export interface CreateUserBody {
  displayName: string;
  role: UserRoleName;
}

export interface UpdateUserBody {
  displayName?: string;
  status?: UserStatus;
}

export interface UpdateStudentBody {
  name?: string;
  classId?: string;
  status?: StudentStatus;
}

export interface UpdateLeaveStatusBody {
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}

export interface MarkAttendanceBody {
  studentId: string;
  date: string; // ISO datetime
  status: AttendanceStatus;
}

export type AnnouncementScope = 'SCHOOL' | 'CLASS';

export interface CreateAnnouncementBody {
  scope: AnnouncementScope;
  classId?: string;
  title: string;
  body: string;
}

export type AuditResult = 'SUCCESS' | 'FAILURE' | 'DENIED';

export interface AuditLogView {
  id: string;
  actorUserId: string | null;
  actorName: string | null; // 讀取時 join 出來的顯示名；查不到人時為 null
  actorRole: string | null; // 操作當下的身分快照（可能是逗號分隔的多個角色）
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: AuditResult;
  scopeType: string | null;
  scopeId: string | null;
  metadata: unknown;
  createdAt: string; // ISO
}

// 稽核查詢端點回應為信封（與其他端點不同）。
export interface AuditLogPage {
  data: AuditLogView[];
  meta: { total: number; limit: number; offset: number };
}

export interface AuditLogFilters {
  resourceType?: string;
  actor?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

// --- 每日聯絡簿（階段2 刀4）---
export type MealAmount = 'ALL' | 'MOST' | 'HALF' | 'LITTLE' | 'NONE';
export type NapQuality = 'WELL' | 'SHORT' | 'NONE';
export type ToiletState = 'NORMAL' | 'LOOSE' | 'HARD' | 'NONE';
export type Mood = 'HAPPY' | 'CALM' | 'SLEEPY' | 'LOW';
export type HealthSymptom =
  | 'COUGH'
  | 'RUNNY_NOSE'
  | 'SORE_THROAT'
  | 'DIARRHEA'
  | 'VOMITING'
  | 'POOR_APPETITE'
  | 'LOW_ENERGY'
  | 'RASH';
export type PickupMethod = 'FAMILY' | 'SCHOOL_BUS';

export interface BookEntryView {
  id: string;
  studentId: string;
  date: string; // ISO
  arrivalTime: string | null; // "HH:mm"
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
  filledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

// 局部更新：只送要改的欄位；明確 null 代表清空。
export interface SaveBookEntryBody {
  studentId: string;
  date: string; // ISO datetime
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

export interface BookCheckInBody {
  studentId: string;
  date: string;
  arrivalTime: string;
  status?: 'PRESENT' | 'LATE';
}

export interface PublishBookBody {
  classId: string;
  date: string;
  pushStudentIds: string[];
}

export interface AnnouncementView {
  id: string;
  schoolId: string;
  classId: string | null;
  scope: AnnouncementScope;
  title: string;
  body: string;
  createdBy: string;
  createdAt: string; // ISO
}

// ---------- 娃娃車 / 接送（Phase 9 ⑦ 刀1）----------
// door-to-door：車開到每個孩子的家門口，所以是「接送點」不是「站牌」。

export type BusDirection = 'MORNING' | 'AFTERNOON';
export type BusRideStatus = 'SCHEDULED' | 'BOARDED' | 'ALIGHTED' | 'ABSENT';
export type BusRideSource = 'MANUAL' | 'LEAVE_EVENT';

export interface BusPointView {
  id: string;
  routeId: string;
  name: string;
  address: string | null;
  orderAm: number;
  orderPm: number;
  etaAm: string | null; // "HH:mm"
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
  date: string; // ISO
  studentId: string;
  routeId: string;
  direction: BusDirection;
  pointId: string | null;
  status: BusRideStatus;
  boardedAt: string | null;
  alightedAt: string | null;
  boardLat: number | null;
  boardLng: number | null;
  alightLat: number | null;
  alightLng: number | null;
  source: BusRideSource;
  recordedBy: string | null;
}

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
  onLeaveCount: number;
}

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

export interface SaveBusRouteBody {
  name: string;
  morningDepart?: string | null;
  afternoonDepart?: string | null;
  isActive?: boolean;
  busTeacherId?: string | null;
}

export interface SaveBusPointBody {
  routeId: string;
  name: string;
  address?: string | null;
  etaAm?: string | null;
  etaPm?: string | null;
}

export interface SaveBusAssignmentBody {
  studentId: string;
  routeId: string;
  morningPointId?: string | null;
  afternoonPointId?: string | null;
  ridesMorning?: boolean;
  ridesAfternoon?: boolean;
}

// 緯經度為選填：拒絕定位或沒訊號時就是不送，功能照常運作。
export interface BusMarkBody {
  routeId: string;
  date: string;
  direction: BusDirection;
  studentIds: string[];
  lat?: number;
  lng?: number;
}
