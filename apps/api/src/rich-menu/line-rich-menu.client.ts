import { Injectable, Logger } from '@nestjs/common';

// LINE Messaging API — 圖文選單客戶端。
// 金鑰同推播共用 LINE_MESSAGING_CHANNEL_ACCESS_TOKEN（ADR-004 secret）。
// 未設定 token（dev / CI）→ enabled=false，呼叫端會回報「尚未設定」而不是靜默假成功。
//
// 官方限制（2026-08-17 查證自 LINE Messaging API reference）：
//   底圖 JPEG/PNG、寬 800–2500、高 ≥250、寬/高 ≥1.45、檔案 ≤1MB
//   一份選單最多 20 格；name ≤300 字、chatBarText ≤14 字
//   一個官方帳號最多 1000 份選單；**建立選單 100 次/小時**
//   綁定多人 一次最多 500 人（速率 2000 次/秒），非同步處理、回 202 不代表全部成功
//   **既有選單的底圖無法覆蓋** —— 換圖必須建新選單（官方後台的「換底圖」也是這樣做的）
const API = 'https://api.line.me/v2/bot';
const DATA_API = 'https://api-data.line.me/v2/bot';

export const LINE_BULK_LINK_MAX = 500;
export const LINE_IMAGE_MAX_BYTES = 1024 * 1024;
export const LINE_CHAT_BAR_TEXT_MAX = 14;

export class LineRichMenuError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`LINE rich menu API failed: HTTP ${status} ${body}`);
    this.name = 'LineRichMenuError';
  }
}

export interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number };
  action: { type: 'uri'; uri: string };
}

export interface LinkOutcome {
  linked: number; // 已送出綁定的人數
  skipped: number; // LINE 不認得而被略過的人數（假資料、已刪帳號、未加好友…）
}

export interface RichMenuPayload {
  size: { width: number; height: number };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: RichMenuArea[];
}

@Injectable()
export class LineRichMenuClient {
  private readonly logger = new Logger('LineRichMenu');
  private readonly token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

  get enabled(): boolean {
    return Boolean(this.token);
  }

  private async call(url: string, init: RequestInit): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new LineRichMenuError(res.status, body.slice(0, 300));
    }
    return res;
  }

  async createMenu(payload: RichMenuPayload): Promise<string> {
    const res = await this.call(`${API}/richmenu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { richMenuId: string };
    return data.richMenuId;
  }

  // 底圖必須在綁定任何人之前上傳 —— 沒有圖的選單綁定會被 LINE 以 400 拒絕。
  async uploadImage(richMenuId: string, image: ArrayBuffer, contentType: string): Promise<void> {
    await this.call(`${DATA_API}/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: image,
    });
  }

  // 沒有被個別綁定的好友看到的選單。用於「還沒綁定的人」——不必逐一綁定，
  // 因為我們根本還不知道他們是誰。
  async setDefault(richMenuId: string): Promise<void> {
    await this.call(`${API}/user/all/richmenu/${richMenuId}`, { method: 'POST' });
  }

  // 一次最多 500 人;LINE 端非同步處理，回 202 不代表每個人都成功
  // （已刪帳號、封鎖 OA、未加好友者會被略過），因此呼叫端不可把 202 當成「全部完成」。
  //
  // **批次含一個無效 ID，LINE 會整批拒絕**（官方明講：回錯誤時沒有任何人被綁定）。
  // 實務上一定會遇到：demo 的假資料、離職後刪帳號的人、封鎖過官方帳號的家長。
  // 因此整批被拒時改成逐一綁定，讓其餘的人照樣拿到選單 —— 這是先前推播踩過的同一個坑
  // （單一收件人失敗中斷整批，排在後面的人永遠收不到）。
  // 4xx＝這個人永遠不會成功 → 略過;5xx／網路錯誤＝暫時性 → 往上丟，不要假裝成功。
  async linkUsers(richMenuId: string, userIds: string[]): Promise<LinkOutcome> {
    let linked = 0;
    let skipped = 0;

    for (let i = 0; i < userIds.length; i += LINE_BULK_LINK_MAX) {
      const batch = userIds.slice(i, i + LINE_BULK_LINK_MAX);
      try {
        await this.call(`${API}/richmenu/bulk/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ richMenuId, userIds: batch }),
        });
        linked += batch.length;
      } catch (e: unknown) {
        if (!(e instanceof LineRichMenuError) || e.status >= 500) {
          throw e;
        }
        this.logger.warn(`整批綁定被拒（${e.body}）→ 改為逐一綁定，略過無效的帳號`);
        const outcome = await this.linkOneByOne(richMenuId, batch);
        linked += outcome.linked;
        skipped += outcome.skipped;
      }
    }

    return { linked, skipped };
  }

  private async linkOneByOne(richMenuId: string, userIds: string[]): Promise<LinkOutcome> {
    let linked = 0;
    let skipped = 0;
    for (const userId of userIds) {
      try {
        await this.linkUser(richMenuId, userId);
        linked += 1;
      } catch (e: unknown) {
        if (!(e instanceof LineRichMenuError) || e.status >= 500) {
          throw e;
        }
        skipped += 1;
      }
    }
    return { linked, skipped };
  }

  async linkUser(richMenuId: string, userId: string): Promise<void> {
    await this.call(`${API}/user/${userId}/richmenu/${richMenuId}`, { method: 'POST' });
  }

  // 舊選單用完要刪 —— 一個帳號上限 1000 份，每次套用都留一份的話遲早塞滿。
  // 刪除失敗不該讓整個套用失敗（新選單已經生效了），因此只記錄不丟出。
  async deleteMenu(richMenuId: string): Promise<void> {
    try {
      await this.call(`${API}/richmenu/${richMenuId}`, { method: 'DELETE' });
    } catch (e: unknown) {
      this.logger.warn(`刪除舊選單 ${richMenuId} 失敗（不影響新選單）: ${String(e)}`);
    }
  }
}
