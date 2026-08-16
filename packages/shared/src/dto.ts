// API DTO / 輸入驗證 (Zod)。系統邊界驗證所有輸入 (§coding-style)。
// 後端 controller 與前端 client 共用同一 schema。
import { z } from 'zod';

export const LineLoginDto = z.object({
  idToken: z.string().min(1),
});
export type LineLoginDto = z.infer<typeof LineLoginDto>;

export const CreateLeaveDto = z.object({
  studentId: z.string().min(1),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  reason: z.string().min(1).max(500),
});
export type CreateLeaveDto = z.infer<typeof CreateLeaveDto>;

// 審核（approve/reject）；取消為獨立端點 PATCH /leaves/:id/cancel (修正 A)
export const UpdateLeaveStatusDto = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(500).optional(),
});
export type UpdateLeaveStatusDto = z.infer<typeof UpdateLeaveStatusDto>;

export const CreateAttendanceDto = z.object({
  studentId: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(['PRESENT', 'ABSENT', 'LEAVE', 'LATE']),
});
export type CreateAttendanceDto = z.infer<typeof CreateAttendanceDto>;

export const CreateMessageDto = z.object({
  studentId: z.string().min(1),
  category: z.enum(['GENERAL', 'HEALTH', 'BEHAVIOR', 'ADMIN']).default('GENERAL'),
  body: z.string().min(1).max(2000),
});
export type CreateMessageDto = z.infer<typeof CreateMessageDto>;

export const CreateAnnouncementDto = z.object({
  scope: z.enum(['SCHOOL', 'CLASS']),
  classId: z.string().optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});
export type CreateAnnouncementDto = z.infer<typeof CreateAnnouncementDto>;

// PATCH /school/config（園所外觀/功能設定，OWNER/ADMIN）。
// 全欄位選填 = 局部更新;顏色限 #RRGGBB;圖片限 http(s) 或站內相對路徑（內建圖庫）。
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const IMAGE_REF = /^(https?:\/\/|\/)[^\s]*$/;
const FEATURE_KEY = /^[a-z][a-z0-9-]{0,30}$/;

export const UpdateSchoolConfigDto = z
  .object({
    brandName: z.string().min(1).max(60),
    logoUrl: z.string().max(2000).regex(IMAGE_REF).nullable(),
    bannerUrl: z.string().max(2000).regex(IMAGE_REF).nullable(),
    primaryColor: z.string().regex(HEX_COLOR),
    secondaryColor: z.string().regex(HEX_COLOR),
    featureFlags: z.record(z.string().regex(FEATURE_KEY), z.boolean()),
    cardOrder: z.array(z.string().regex(FEATURE_KEY)).max(40),
    leaveRequiresApproval: z.boolean(),
  })
  .partial();
export type UpdateSchoolConfigDto = z.infer<typeof UpdateSchoolConfigDto>;
