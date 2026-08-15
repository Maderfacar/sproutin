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
