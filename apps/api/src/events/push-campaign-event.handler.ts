import { Injectable, Logger } from '@nestjs/common';
import type { PushCampaignQueuedPayload } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { PushNotificationService } from './push-notification.service';
import { buildCampaignFlex } from './flex-message';
import { resolveCampaignRecipients } from '../push-campaigns/campaign-audience';
import type {
  PushCampaignAudienceName,
  PushCampaignTemplateName,
} from '../push-campaigns/push-campaign.types';

// PushCampaignQueued → 真的把 Flex 卡片送到 LINE（Phase 9 階段3）。
//
// **為什麼群發失敗不自動重試**（與其他事件不同，這是刻意的）：
//   其他事件（請假核准、聯絡簿）重試最多讓一位家長收到重複訊息，划算。
//   群發一次是全校兩百則 —— 自動重試等於再收一次費用、讓已收到的家長再收一次。
//   因此這裡把實際結果寫進 PushCampaign（送出幾則 / 略過幾則 / 失敗原因）並標為 FAILED，
//   讓園長在後台看見「只送到 150 位」後自己決定要不要重發。
//   這不是沉默降級：狀態、數字與原因都寫下來且顯示在後台。
@Injectable()
export class PushCampaignEventHandler {
  private readonly logger = new Logger('PushCampaign');

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushNotificationService,
  ) {}

  async send(payload: PushCampaignQueuedPayload): Promise<void> {
    const campaign = await this.prisma.pushCampaign.findUnique({
      where: { id: payload.campaignId },
    });
    if (!campaign) {
      return; // 紀錄不見了（不該發生）→ 不重試，避免卡住 dispatcher。
    }
    // 已經處理過（BullMQ at-least-once 與 worker 重啟時的 resetStaleProcessing 都會重放事件）
    // → **絕不送第二次**。群發的 idempotency 比什麼都重要：重放一次就是全校再收一則。
    if (campaign.status !== 'QUEUED') {
      if (campaign.status === 'SENDING') {
        // 上一輪送到一半時進程中斷。停在 SENDING 會讓後台永遠顯示「正在送出」，
        // 所以改標失敗並說實話：我們不知道送出了幾則。
        await this.prisma.pushCampaign.update({
          where: { id: campaign.id },
          data: {
            status: 'FAILED',
            failureReason: '送出過程中系統中斷，無法確認實際送出幾則；重發前請先確認家長是否已收到',
          },
        });
      }
      this.logger.warn(`群發 ${campaign.id} 已處理過（${campaign.status}）→ 略過重放`);
      return;
    }

    await this.prisma.pushCampaign.update({
      where: { id: campaign.id },
      data: { status: 'SENDING' },
    });

    const config = await this.prisma.schoolConfig.findFirst({ select: { brandName: true } });
    const flex = buildCampaignFlex(
      {
        template: campaign.template as PushCampaignTemplateName,
        title: campaign.title,
        body: campaign.body,
        imageUrl: campaign.imageUrl,
        fields: (campaign.fields as Record<string, string>) ?? {},
        button:
          campaign.buttonLabel && campaign.buttonUrl
            ? { label: campaign.buttonLabel, url: campaign.buttonUrl }
            : null,
      },
      config?.brandName ?? '',
    );

    // **重新解析收件人**：建立與送出之間可能有人剛完成綁定（也可能有人被停用）。
    // 建立時算的 recipientCount 是給園長看的預估，這裡算的才是實際送信對象。
    const recipients = await resolveCampaignRecipients(
      this.prisma,
      campaign.audience as PushCampaignAudienceName,
      campaign.classId,
    );

    const outcome = await this.push.sendFlexToLineIds(recipients.lineUserIds, flex);

    await this.prisma.pushCampaign.update({
      where: { id: campaign.id },
      data: {
        status: outcome.transientError ? 'FAILED' : 'SENT',
        sentCount: outcome.sent,
        skippedCount: outcome.skipped,
        sentAt: new Date(),
        failureReason: outcome.transientError ? this.reasonFor(outcome.transientError) : null,
      },
    });

    if (outcome.transientError) {
      this.logger.error(
        `群發 ${campaign.id} 部分失敗：送出 ${outcome.sent}、略過 ${outcome.skipped}`,
      );
    }
  }

  // 給園長看的一句話（不是給工程師看的堆疊）。詳細內容已在 logger.error。
  private reasonFor(error: unknown): string {
    const detail = error instanceof Error ? error.message : String(error);
    return `LINE 暫時無法送出，尚未送達的家長沒有收到（${detail}）`.slice(0, 300);
  }
}
