import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';
import { LineRichMenuClient } from './line-rich-menu.client';

const STAFF_ROLES = ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER'];

// 綁定成功的當下，把這個人換上對應身分的選單。
//
// 為什麼要有這一支：綁定前他看到的是「還沒綁定的人」那份選單（預設選單，只有一顆開始使用）。
// 綁定成功後如果不換，他得等園所下次「套用」才會拿到家長版 —— 那是很糟的第一印象。
//
// **綁定不可因為換選單失敗而失敗**：LINE 掛掉、token 沒設、對方還沒加好友都不該讓人綁不了帳號。
// 因此這裡所有錯誤只記錄不丟出;真的沒換到，園所下次套用時會一起補上。
//
// 刻意獨立成一個不依賴 AuthModule 的小模組，避免 AuthModule ↔ RichMenuModule 循環相依。
@Injectable()
export class RichMenuLinkService {
  private readonly logger = new Logger('RichMenuLink');

  constructor(
    private readonly prisma: PrismaService,
    private readonly line: LineRichMenuClient,
  ) {}

  async linkAfterBinding(userId: string, lineUserId: string): Promise<void> {
    if (!this.line.enabled) {
      return;
    }
    try {
      const roles = await this.prisma.userRole.findMany({
        where: { userId },
        select: { role: true },
      });
      const isStaff = roles.some((r) => STAFF_ROLES.includes(r.role));
      const audience = isStaff ? 'STAFF' : 'PARENT';

      const config = await this.prisma.richMenuConfig.findUnique({
        where: { audience },
        select: { lineRichMenuId: true },
      });
      // 園所還沒套用過那份選單 → 沒東西可換，維持預設選單即可。
      if (!config?.lineRichMenuId) {
        return;
      }

      await this.line.linkUser(config.lineRichMenuId, lineUserId);
    } catch (e: unknown) {
      this.logger.warn(`綁定後換選單失敗（不影響綁定本身）: ${String(e)}`);
    }
  }
}
