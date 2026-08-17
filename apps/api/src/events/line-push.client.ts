import { Injectable, Logger } from '@nestjs/common';

// LINE Messaging API — Push message 客戶端（docs/06 §1 async 副作用）。
// 金鑰來自 env LINE_MESSAGING_CHANNEL_ACCESS_TOKEN（ADR-004 secret;Render sync:false）。
// 未設定 token（dev / CI）→ 略過（不丟出）—— 讓無金鑰環境也能安全運行。
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

// 帶狀態碼的推播錯誤，讓呼叫端能分辨「這個收件人永遠不會成功」（4xx，如無效 LINE ID、
// 對方封鎖 OA）與「暫時性失敗」（5xx / 網路）——前者略過、後者才值得重試。
export class LinePushError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`LINE push failed: HTTP ${status} ${body}`);
    this.name = 'LinePushError';
  }
}

@Injectable()
export class LinePushClient {
  private readonly logger = new Logger('LinePush');
  private readonly token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

  get enabled(): boolean {
    return Boolean(this.token);
  }

  // 推一則純文字給某 LINE user（to = LINE userId）。
  // 失敗（非 2xx）→ 丟出，交由 BullMQ 重試（best-effort，Human Owner 決策）。
  async push(to: string, text: string): Promise<void> {
    await this.send(to, { type: 'text', text });
  }

  // 推一則 Flex 卡片（群發與公告推播用）。
  // altText 是通知列與不支援 Flex 的環境所顯示的文字，**必須自成完整訊息**。
  // 一次 push 最多 5 個訊息物件（已查證），我們固定送 1 個。
  async pushFlex(to: string, altText: string, contents: Record<string, unknown>): Promise<void> {
    await this.send(to, { type: 'flex', altText, contents });
  }

  private async send(to: string, message: Record<string, unknown>): Promise<void> {
    if (!this.token) {
      this.logger.warn('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN 未設定 → 略過 LINE 推播');
      return;
    }
    const res = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ to, messages: [message] }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new LinePushError(res.status, body);
    }
  }
}
