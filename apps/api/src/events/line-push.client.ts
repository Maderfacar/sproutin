import { Injectable, Logger } from '@nestjs/common';

// LINE Messaging API — Push message 客戶端（docs/06 §1 async 副作用）。
// 金鑰來自 env LINE_MESSAGING_CHANNEL_ACCESS_TOKEN（ADR-004 secret;Render sync:false）。
// 未設定 token（dev / CI）→ 略過（不丟出）—— 讓無金鑰環境也能安全運行。
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

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
      body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LINE push failed: HTTP ${res.status} ${body}`);
    }
  }
}
