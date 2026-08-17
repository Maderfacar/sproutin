import { Module } from '@nestjs/common';
import { LineRichMenuClient } from './line-rich-menu.client';
import { RichMenuLinkService } from './rich-menu-link.service';

// 只含「把某個人換上對應選單」這一件事，**不依賴 AuthModule**。
// AuthModule（綁定成功時要換選單）與 RichMenuModule（後台套用）都 import 這一個，
// 因此不會形成 AuthModule ↔ RichMenuModule 的循環相依。
@Module({
  providers: [LineRichMenuClient, RichMenuLinkService],
  exports: [LineRichMenuClient, RichMenuLinkService],
})
export class RichMenuLinkModule {}
