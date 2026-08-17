import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../core/audit/audit.module';
import { RichMenuLinkModule } from './rich-menu-link.module';
import { RichMenuController } from './rich-menu.controller';
import { RichMenuService } from './rich-menu.service';

// 園所 LINE 圖文選單（Phase 9 階段3 ④）。
// LineRichMenuClient 由 RichMenuLinkModule 提供並匯出，兩邊共用同一個客戶端。
@Module({
  imports: [AuthModule, AuditModule, RichMenuLinkModule],
  controllers: [RichMenuController],
  providers: [RichMenuService],
})
export class RichMenuModule {}
