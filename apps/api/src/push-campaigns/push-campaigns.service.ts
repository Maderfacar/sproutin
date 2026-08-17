import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@sproutin/shared';
import type { Prisma } from '@sproutin/db';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuditService } from '../core/audit/audit.service';
import { resolveCampaignRecipients } from './campaign-audience';
import {
  APP_PAGE_PATHS,
  BODY_MAX,
  BUTTON_LABEL_MAX,
  FIELD_VALUE_MAX,
  TEMPLATE_FIELDS,
  TITLE_MAX,
  clamp,
  type AppPageName,
  type PushCampaignAudienceName,
  type PushCampaignTemplateName,
} from './push-campaign.types';

export interface CampaignActor {
  id: string;
  roles: AuthUser['roles'];
}

export interface CreateCampaignInput {
  template: PushCampaignTemplateName;
  audience: PushCampaignAudienceName;
  classId: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  fields: Record<string, string>;
  button: { label: string; page?: AppPageName; url?: string } | null;
}

export interface RecipientPreview {
  willReceive: number; // 已綁定 LINE，真的收得到
  unbound: number; // 在範圍內但還沒綁定 → 收不到
}

export interface CampaignView {
  id: string;
  template: PushCampaignTemplateName;
  audience: PushCampaignAudienceName;
  classId: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  fields: Record<string, string>;
  status: string;
  failureReason: string | null;
  recipientCount: number;
  sentCount: number;
  skippedCount: number;
  createdBy: string;
  createdAt: string;
  sentAt: string | null;
}

const CAMPAIGN_VIEW = {
  id: true,
  template: true,
  audience: true,
  classId: true,
  title: true,
  body: true,
  imageUrl: true,
  buttonLabel: true,
  buttonUrl: true,
  fields: true,
  status: true,
  failureReason: true,
  recipientCount: true,
  sentCount: true,
  skippedCount: true,
  createdBy: true,
  createdAt: true,
  sentAt: true,
} as const;

const EVENT = 'PushCampaignQueued';
const LIST_LIMIT = 50;

// 後台的 LINE 群發（Phase 9 階段3）。
//
// **api 只負責「排入」，不負責送出**：寫 PushCampaign + OutboxEvent + 稽核於同一交易，
// 由 worker 消費事件後真的送到 LINE。理由有三：
//   ① 全校兩百位家長的送信不該卡住園長的畫面；
//   ② 失敗可由 BullMQ 重試，而不是讓園長重按一次（重按＝重複收費 + 家長收到兩則）；
//   ③ 送信邏輯已經在 worker 側（PushNotificationService），連帶繼承「單一收件人失敗不拖垮
//      整批」那套處理 —— 那個坑踩過兩次，不再複製第三份實作。
@Injectable()
export class PushCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // 送出前的預估。**兩個數字一起回**：只回「會送出 N 則」會讓園長把「還沒綁定的人收不到」
  // 誤判成系統漏發。
  async previewRecipients(
    audience: PushCampaignAudienceName,
    classId: string | null,
  ): Promise<RecipientPreview> {
    if (audience === 'CLASS' && !classId) {
      throw new BadRequestException('class_id_required');
    }
    const r = await resolveCampaignRecipients(this.prisma, audience, classId);
    return { willReceive: r.lineUserIds.length, unbound: r.unboundCount };
  }

  async list(): Promise<CampaignView[]> {
    const rows = await this.prisma.pushCampaign.findMany({
      select: CAMPAIGN_VIEW,
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
    return rows.map((r) => this.toView(r));
  }

  // 排入一次群發。回傳當下的預估人數，讓前端能顯示「已排入，將送出 N 則」。
  async create(actor: CampaignActor, input: CreateCampaignInput): Promise<CampaignView> {
    if (input.audience === 'CLASS' && !input.classId) {
      throw new BadRequestException('class_id_required');
    }
    if (input.audience !== 'CLASS' && input.classId) {
      // 收件範圍不是班級卻帶了班級 → 園長大概選錯了，不要默默忽略他的意思。
      throw new BadRequestException('class_id_not_allowed');
    }
    if (input.classId) {
      const found = await this.prisma.class.findUnique({
        where: { id: input.classId },
        select: { id: true },
      });
      if (!found) {
        throw new BadRequestException('class_not_found');
      }
    }

    const button = await this.resolveButton(input.button);
    const fields = this.pickFields(input.template, input.fields);
    const recipients = await resolveCampaignRecipients(
      this.prisma,
      input.audience,
      input.classId,
    );

    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.pushCampaign.create({
        data: {
          template: input.template,
          audience: input.audience,
          classId: input.classId,
          title: clamp(input.title, TITLE_MAX),
          body: clamp(input.body, BODY_MAX),
          imageUrl: input.imageUrl,
          buttonLabel: button?.label ?? null,
          buttonUrl: button?.url ?? null,
          fields: fields as Prisma.InputJsonValue,
          recipientCount: recipients.lineUserIds.length,
          createdBy: actor.id,
        },
        select: CAMPAIGN_VIEW,
      });

      await tx.outboxEvent.create({
        data: {
          eventType: EVENT,
          // 只帶 id —— 內容已經在 PushCampaign，複製一份到事件裡就有兩個版本。
          payload: { campaignId: campaign.id } as Prisma.InputJsonValue,
        },
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        actorRole: actor.roles.map((r) => r.role).join(',') || null,
        action: 'push_campaign.create',
        resourceType: 'PushCampaign',
        resourceId: campaign.id,
        result: 'SUCCESS',
        // 只記對象與數量,**不記標題內文**（訊息內容屬敏感明文，修正 C）。
        metadata: {
          template: input.template,
          audience: input.audience,
          classId: input.classId,
          recipientCount: recipients.lineUserIds.length,
          unboundCount: recipients.unboundCount,
        },
      });

      return this.toView(campaign);
    });
  }

  // 按鈕的目的地在**建立當下**就解析成最終網址並存起來：
  //   ① 紀錄裡看到的就是家長實際點到的網址（群發不可收回，帳要精準）；
  //   ② liffId 日後若變更，不會讓歷史紀錄顯示成另一個連結。
  private async resolveButton(
    input: CreateCampaignInput['button'],
  ): Promise<{ label: string; url: string } | null> {
    if (!input) {
      return null;
    }
    const label = clamp(input.label, BUTTON_LABEL_MAX);
    if (label.length === 0) {
      throw new BadRequestException('button_label_required');
    }
    if (input.page && input.url) {
      throw new BadRequestException('button_target_ambiguous');
    }

    if (input.url) {
      // **只接受 https**：LINE 的 uri action 不吃 http，而 javascript: / data: 這類
      // 一旦放行就是把家長送到我們無法保證的地方（Human Owner 已知並接受外部連結的風險）。
      if (!input.url.startsWith('https://')) {
        throw new BadRequestException('button_url_must_be_https');
      }
      return { label, url: input.url };
    }

    if (!input.page) {
      throw new BadRequestException('button_target_required');
    }
    const path = APP_PAGE_PATHS[input.page];
    if (path === undefined) {
      throw new BadRequestException('button_page_invalid');
    }
    const config = await this.prisma.schoolConfig.findFirst({ select: { liffId: true } });
    if (!config?.liffId) {
      // 沉默降級成「沒有按鈕」會讓園長以為送出去了卻沒有入口 —— 明說原因。
      throw new BadRequestException('liff_id_not_configured');
    }
    return { label, url: `https://liff.line.me/${config.liffId}${path ? `/${path}` : ''}` };
  }

  // 只留該版型認得的欄位（換版型後殘留的舊欄位不該跟著送出），並逐一截斷長度。
  private pickFields(
    template: PushCampaignTemplateName,
    fields: Record<string, string>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of TEMPLATE_FIELDS[template]) {
      const value = (fields[key] ?? '').trim();
      if (value.length > 0) {
        result[key] = clamp(value, FIELD_VALUE_MAX);
      }
    }
    return result;
  }

  private toView(row: {
    id: string;
    template: string;
    audience: string;
    classId: string | null;
    title: string;
    body: string;
    imageUrl: string | null;
    buttonLabel: string | null;
    buttonUrl: string | null;
    fields: unknown;
    status: string;
    failureReason: string | null;
    recipientCount: number;
    sentCount: number;
    skippedCount: number;
    createdBy: string;
    createdAt: Date;
    sentAt: Date | null;
  }): CampaignView {
    return {
      id: row.id,
      template: row.template as PushCampaignTemplateName,
      audience: row.audience as PushCampaignAudienceName,
      classId: row.classId,
      title: row.title,
      body: row.body,
      imageUrl: row.imageUrl,
      buttonLabel: row.buttonLabel,
      buttonUrl: row.buttonUrl,
      fields: (row.fields as Record<string, string>) ?? {},
      status: row.status,
      failureReason: row.failureReason,
      recipientCount: row.recipientCount,
      sentCount: row.sentCount,
      skippedCount: row.skippedCount,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      sentAt: row.sentAt?.toISOString() ?? null,
    };
  }
}
