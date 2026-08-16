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
  CommunicationBookPublished: 'CommunicationBookPublished',
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

// 老師送出當日聯絡簿（刀4）。studentIds = 本次送出的全部學生;
// pushStudentIds ⊆ studentIds = 老師選擇「立即以 LINE 通知」的學生（通常是健康需注意者）。
// 其餘學生只寫站內通知不推 LINE —— 每日聯絡簿若全班推播，LINE 訊息量與費用會失控。
export interface CommunicationBookPublishedPayload {
  classId: string;
  date: string;
  studentIds: string[];
  pushStudentIds: string[];
}

export interface DomainEventMap {
  LeaveSubmitted: LeaveSubmittedPayload;
  LeaveApproved: LeaveApprovedPayload;
  LeaveRejected: LeaveRejectedPayload;
  LeaveCancelled: LeaveCancelledPayload;
  MessageSent: MessageSentPayload;
  AnnouncementPublished: AnnouncementPublishedPayload;
  AttendanceMarked: AttendanceMarkedPayload;
  CommunicationBookPublished: CommunicationBookPublishedPayload;
}
