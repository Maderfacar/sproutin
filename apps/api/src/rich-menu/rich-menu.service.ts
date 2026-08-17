import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';
import {
  LINE_CHAT_BAR_TEXT_MAX,
  LINE_IMAGE_MAX_BYTES,
  LineRichMenuClient,
  LineRichMenuError,
  type RichMenuArea,
} from './line-rich-menu.client';
import { imageSizeProblem, readImageSize, type ImageSize } from './image-size';
import {
  TARGET_PATHS,
  TEMPLATE_SHAPES,
  UNBOUND_DEFAULT_ITEMS,
  cellCount,
  cellsFor,
  type RichMenuAudienceName,
  type RichMenuItem,
  type RichMenuTemplateName,
} from './rich-menu.types';

export interface RichMenuActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface RichMenuConfigView {
  audience: RichMenuAudienceName;
  template: RichMenuTemplateName;
  imageUrl: string | null;
  chatBarText: string;
  items: RichMenuItem[];
  appliedAt: string | null;
  isApplied: boolean;
}

export interface SaveRichMenuInput {
  template: RichMenuTemplateName;
  imageUrl: string | null;
  chatBarText: string;
  items: RichMenuItem[];
}

export interface ApplyResult {
  audience: RichMenuAudienceName;
  linkedUsers: number; // 送出綁定的人數（LINE 端非同步處理，不等於全部成功）
  appliedAt: string;
}

// 教職員身分（決定 STAFF 選單要綁給誰）。家長／監護人則對應 PARENT。
const STAFF_ROLES = ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER'];
const PARENT_ROLES = ['PARENT', 'GUARDIAN'];

// 園所的 LINE 圖文選單（Phase 9 階段3 ④）。
//
// **儲存與套用刻意分開**：LINE 的「建立選單」有每小時 100 次上限，而園長調版面時會存很多次。
// 儲存只寫我們自己的資料庫;只有按「套用」才會真的動到 LINE。
//
// 套用的實際動作是「建一份新的 → 綁人 → 刪掉舊的」，因為 LINE 不允許覆蓋既有選單的底圖。
// 使用者感受到的是「換好了」，與官方後台的行為一致。
@Injectable()
export class RichMenuService {
  private readonly logger = new Logger('RichMenu');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly line: LineRichMenuClient,
  ) {}

  async list(): Promise<RichMenuConfigView[]> {
    const rows = await this.prisma.richMenuConfig.findMany();
    const byAudience = new Map(rows.map((r) => [r.audience as RichMenuAudienceName, r]));
    const audiences: RichMenuAudienceName[] = ['PARENT', 'STAFF', 'UNBOUND'];
    return audiences.map((audience) => {
      const row = byAudience.get(audience);
      if (!row) {
        // 還沒設定過 → 回一份空白預設，前端不必分「有／沒有」兩種畫面。
        return {
          audience,
          template: audience === 'UNBOUND' ? 'TWO' : 'SIX',
          imageUrl: null,
          chatBarText: '開啟選單',
          items: audience === 'UNBOUND' ? UNBOUND_DEFAULT_ITEMS : [],
          appliedAt: null,
          isApplied: false,
        };
      }
      return {
        audience,
        template: row.template as RichMenuTemplateName,
        imageUrl: row.imageUrl,
        chatBarText: row.chatBarText,
        items: (row.items as unknown as RichMenuItem[]) ?? [],
        appliedAt: row.appliedAt?.toISOString() ?? null,
        isApplied: Boolean(row.lineRichMenuId),
      };
    });
  }

  async save(
    actor: RichMenuActor,
    audience: RichMenuAudienceName,
    input: SaveRichMenuInput,
  ): Promise<RichMenuConfigView> {
    this.assertValidDesign(input);

    await this.prisma.$transaction(async (tx) => {
      await tx.richMenuConfig.upsert({
        where: { audience },
        create: {
          audience,
          template: input.template,
          imageUrl: input.imageUrl,
          chatBarText: input.chatBarText,
          items: input.items as unknown as object,
        },
        update: {
          template: input.template,
          imageUrl: input.imageUrl,
          chatBarText: input.chatBarText,
          items: input.items as unknown as object,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: actor.roles.map((r) => r.role).join(',') || null,
        action: 'rich_menu.save',
        resourceType: 'RichMenuConfig',
        resourceId: audience,
        result: 'SUCCESS',
        metadata: { audience, template: input.template, items: input.items.length },
      });
    });

    const all = await this.list();
    return all.find((c) => c.audience === audience)!;
  }

  // 真正送到 LINE。回傳送出綁定的人數 —— LINE 端非同步處理，回 202 不代表每個人都成功
  // （已刪帳號／封鎖 OA／未加好友者會被略過），所以這個數字是「送出」不是「完成」。
  async apply(actor: RichMenuActor, audience: RichMenuAudienceName): Promise<ApplyResult> {
    if (!this.line.enabled) {
      throw new BadRequestException('line_messaging_not_configured');
    }

    const row = await this.prisma.richMenuConfig.findUnique({ where: { audience } });
    if (!row) {
      throw new BadRequestException('rich_menu_not_saved');
    }
    if (!row.imageUrl) {
      // 沒有底圖的選單，LINE 會在綁定時以 400 拒絕 —— 提早擋下並說清楚原因。
      throw new BadRequestException('rich_menu_image_required');
    }

    const design: SaveRichMenuInput = {
      template: row.template as RichMenuTemplateName,
      imageUrl: row.imageUrl,
      chatBarText: row.chatBarText,
      items: (row.items as unknown as RichMenuItem[]) ?? [],
    };
    this.assertValidDesign(design);

    const liffId = await this.requireLiffId();
    const image = await this.fetchImage(row.imageUrl);

    // **選單尺寸＝底圖的實際尺寸**。LINE 要求兩者完全一致，寫死尺寸會逼園所去湊圖。
    const cells = cellsFor(design.template, image.size.width, image.size.height);
    const areas: RichMenuArea[] = design.items.map((item) => {
      const cell = cells[item.index];
      if (!cell) {
        throw new BadRequestException('rich_menu_item_out_of_range');
      }
      const path = TARGET_PATHS[item.target];
      return {
        bounds: cell,
        // LIFF URL 支援附加路徑（SDK 以 liff.state 轉址到 Endpoint URL + 該路徑）。
        action: { type: 'uri', uri: `https://liff.line.me/${liffId}${path ? `/${path}` : ''}` },
      };
    });

    // LINE 拒絕時要讓園長看得懂是哪裡不對，而不是丟一個 INTERNAL_ERROR 出去。
    const newId = await this.callLine(() =>
      this.line.createMenu({
        size: { width: image.size.width, height: image.size.height },
        selected: false,
        name: `sproutin-${audience.toLowerCase()}-${Date.now()}`,
        chatBarText: design.chatBarText,
        areas,
      }),
    );
    await this.callLine(() => this.line.uploadImage(newId, image.bytes, image.contentType));

    let linkedUsers = 0;
    if (audience === 'UNBOUND') {
      // 還沒綁定的人我們根本不知道是誰 → 設為預設選單。
      // 個別綁定的優先權高於預設，所以已綁定的人不會被這一步影響。
      await this.callLine(() => this.line.setDefault(newId));
    } else {
      const userIds = await this.lineUserIdsFor(audience);
      if (userIds.length > 0) {
        await this.callLine(() => this.line.linkUsers(newId, userIds));
      }
      linkedUsers = userIds.length;
    }

    const previousId = row.lineRichMenuId;
    const appliedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.richMenuConfig.update({
        where: { audience },
        data: { lineRichMenuId: newId, appliedAt },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: actor.roles.map((r) => r.role).join(',') || null,
        action: 'rich_menu.apply',
        resourceType: 'RichMenuConfig',
        resourceId: audience,
        result: 'SUCCESS',
        // 只記數量與對象，不記 lineUserId（識別性資料，修正 C）。
        metadata: { audience, linkedUsers },
      });
    });

    // 舊的用完才刪 —— 先刪的話中途失敗會讓所有人暫時沒有選單。
    if (previousId) {
      await this.line.deleteMenu(previousId);
    }

    return { audience, linkedUsers, appliedAt: appliedAt.toISOString() };
  }

  private assertValidDesign(input: SaveRichMenuInput): void {
    if (!TEMPLATE_SHAPES[input.template]) {
      throw new BadRequestException('rich_menu_template_invalid');
    }
    const cells = cellCount(input.template);
    if (input.chatBarText.length === 0 || input.chatBarText.length > LINE_CHAT_BAR_TEXT_MAX) {
      throw new BadRequestException('rich_menu_chat_bar_text_length');
    }
    const seen = new Set<number>();
    for (const item of input.items) {
      if (item.index < 0 || item.index >= cells) {
        throw new BadRequestException('rich_menu_item_out_of_range');
      }
      if (seen.has(item.index)) {
        throw new BadRequestException('rich_menu_item_duplicated');
      }
      seen.add(item.index);
      if (!(item.target in TARGET_PATHS)) {
        throw new BadRequestException('rich_menu_target_invalid');
      }
    }
    if (input.items.length === 0) {
      // 一格都沒設定的選單點下去什麼都不會發生，比沒有選單更糟。
      throw new BadRequestException('rich_menu_no_items');
    }
  }

  private async requireLiffId(): Promise<string> {
    const config = await this.prisma.schoolConfig.findFirst({ select: { liffId: true } });
    if (!config?.liffId) {
      throw new BadRequestException('liff_id_not_configured');
    }
    return config.liffId;
  }

  // LINE 端的錯誤翻成看得懂的 400（帶上 LINE 自己的說明），而不是讓它變成 INTERNAL_ERROR。
  // 園長看到「圖片尺寸不符」才知道要怎麼修；看到「操作失敗」只能來問人。
  private async callLine<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: unknown) {
      if (e instanceof LineRichMenuError) {
        this.logger.warn(`LINE 拒絕：HTTP ${e.status} ${e.body}`);
        throw new BadRequestException(`line_rejected: ${e.body}`.slice(0, 300));
      }
      throw e;
    }
  }

  private async fetchImage(
    url: string,
  ): Promise<{ bytes: ArrayBuffer; contentType: string; size: ImageSize }> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new BadRequestException('rich_menu_image_unreachable');
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType !== 'image/jpeg' && contentType !== 'image/png') {
      throw new BadRequestException('rich_menu_image_format');
    }
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > LINE_IMAGE_MAX_BYTES) {
      throw new BadRequestException('rich_menu_image_too_large');
    }
    const size = readImageSize(bytes, contentType);
    if (!size) {
      throw new BadRequestException('rich_menu_image_unreadable');
    }
    // 先擋在自己這一關 —— LINE 對尺寸不合的回覆很難懂，而且要等到上傳那一步才會知道。
    const problem = imageSizeProblem(size);
    if (problem) {
      throw new BadRequestException(problem);
    }
    return { bytes, contentType, size };
  }

  private async lineUserIdsFor(audience: RichMenuAudienceName): Promise<string[]> {
    const roles = audience === 'STAFF' ? STAFF_ROLES : PARENT_ROLES;
    const identities = await this.prisma.lineIdentity.findMany({
      where: { user: { status: 'ACTIVE', roles: { some: { role: { in: roles as never } } } } },
      select: { lineUserId: true },
    });
    return identities.map((i) => i.lineUserId);
  }
}
