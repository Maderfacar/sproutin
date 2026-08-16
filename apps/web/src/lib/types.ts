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

export interface CreateStudentBody {
  name: string;
  classId: string;
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
  actorRole: string | null;
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
