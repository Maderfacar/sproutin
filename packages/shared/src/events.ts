// Domain event 定義 (§4, docs/06-event-flow.md) — Revised (修正 A)
// 前後端共用型別；後端發出/訂閱，供未來模組訂閱。

export const EventType = {
  LeaveSubmitted: 'LeaveSubmitted',
  LeaveApproved: 'LeaveApproved',
  LeaveRejected: 'LeaveRejected',
  LeaveCancelled: 'LeaveCancelled',
  MessageSent: 'MessageSent',
  AnnouncementPublished: 'AnnouncementPublished',
  AttendanceMarked: 'AttendanceMarked',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export interface LeaveSubmittedPayload {
  leaveId: string;
  studentId: string;
  dateFrom: string;
  dateTo: string;
  requiresApproval: boolean;
}

export interface LeaveApprovedPayload {
  leaveId: string;
  studentId: string;
  dateFrom: string;
  dateTo: string;
}

export interface LeaveRejectedPayload {
  leaveId: string;
  studentId: string;
  reason?: string;
}

export interface LeaveCancelledPayload {
  leaveId: string;
  studentId: string;
}

export interface MessageSentPayload {
  messageId: string;
  studentId: string;
  classId: string;
  senderId: string;
}

export interface AnnouncementPublishedPayload {
  announcementId: string;
  schoolId: string;
  classId: string | null;
}

export interface AttendanceMarkedPayload {
  studentId: string;
  date: string;
  status: string;
}

export interface DomainEventMap {
  LeaveSubmitted: LeaveSubmittedPayload;
  LeaveApproved: LeaveApprovedPayload;
  LeaveRejected: LeaveRejectedPayload;
  LeaveCancelled: LeaveCancelledPayload;
  MessageSent: MessageSentPayload;
  AnnouncementPublished: AnnouncementPublishedPayload;
  AttendanceMarked: AttendanceMarkedPayload;
}
