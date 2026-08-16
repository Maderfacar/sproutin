import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './core/prisma/prisma.module';
import { HealthModule } from './core/health/health.module';
import { PublicConfigModule } from './core/config/public-config.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { ClassesModule } from './classes/classes.module';
import { SchoolModule } from './school/school.module';
import { UsersModule } from './users/users.module';
import { LeavesModule } from './leaves/leaves.module';
import { AttendanceModule } from './attendance/attendance.module';
import { CommunicationBookModule } from './communication-book/communication-book.module';
import { MessagesModule } from './messages/messages.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditModule } from './core/audit/audit.module';
import { AuditReadInterceptor } from './core/audit/audit-read.interceptor';
import { AuditFailureInterceptor } from './core/audit/audit-failure.interceptor';
import { AllExceptionsFilter } from './core/http/all-exceptions.filter';

// 核心橫切模組 + Phase 6 vertical slice + Phase 7 domain：
// AuthModule（Step 2：LINE/LIFF 登入 → JWT）+ StudentsModule（Step 3：RBAC 示範端點）
// + LeavesModule（Step 1：Leave 狀態機）+ AttendanceModule（Step 2：手動 SoT + ADR-002 override）
// + MessagesModule / AnnouncementsModule / NotificationsModule（Step 4：訊息 / 公告 / 站內通知讀取端）
// + AuditLogsModule（Step 6：稽核查詢端點）+ SchoolModule（Phase 9：園所設定 GET/PATCH /school/config）
// + CommunicationBookModule（Phase 9 階段2 刀4：每日聯絡簿，每生每日一筆 + 點名即到校 + 一鍵送出）。
//
// Step 6 out-of-band audit（ADR-005 類別二）以兩個全域攔截器落地（enqueuer 由 AuditModule 提供）：
//   - AuditReadInterceptor：僅對標了 @AuditRead 的敏感 READ 端點記錄。
//   - AuditFailureInterceptor：狀態變更請求的 5xx 失敗記 FAILURE。
// DENIED 由 guards（AuthModule）直接 enqueue。
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    HealthModule,
    PublicConfigModule,
    AuthModule,
    StudentsModule,
    ClassesModule,
    SchoolModule,
    UsersModule,
    LeavesModule,
    AttendanceModule,
    CommunicationBookModule,
    MessagesModule,
    AnnouncementsModule,
    NotificationsModule,
    AuditLogsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditReadInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditFailureInterceptor },
  ],
})
export class AppModule {}
