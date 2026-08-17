import {
  ALT_TEXT_MAX,
  BODY_MAX,
  FIELD_LABELS,
  TEMPLATE_BADGE,
  TEMPLATE_FIELDS,
  TITLE_MAX,
  clamp,
  type CampaignContent,
} from '../push-campaigns/push-campaign.types';

// Flex Message 的卡片產生器（Phase 9 階段3）。**純函式，無 DI** —— 群發與公告推播共用同一支，
// 公告卡就是「一般通知」版型的一個特例，不寫兩份。
//
// 已查證的 LINE 限制（2026-08-17，官方文件）：
//   定義一個 bubble 的 JSON 上限 **10KB**；一次 push 最多 **5 個訊息物件**（我們用 1 個）。
// **未查到**：altText 的字數上限、Flex 內圖片的尺寸規格。因此不依賴未知數 ——
// 標題／內文／按鈕文字一律先截斷（見 push-campaign.types 的上限常數），
// 無論真正的上限是多少都不會超過，也讓 JSON 遠低於 10KB。
//
// altText 是使用者在 LINE 通知列與不支援 Flex 的環境看到的文字，因此必須自成完整訊息
// （不是「請查看卡片」這種沒有資訊量的佔位字）。

const MUTED = '#8A8A8A';
const BADGE_BG = '#F2F2F2';
const BADGE_TEXT = '#555555';

export interface FlexMessage {
  altText: string;
  contents: Record<string, unknown>;
}

// 一張群發卡片。brandName 放在標題上方 —— 家長的 LINE 裡有很多官方帳號，
// 一眼看出是哪一間園所比訊息內容本身更早被需要。
export function buildCampaignFlex(content: CampaignContent, brandName: string): FlexMessage {
  const title = clamp(content.title, TITLE_MAX);
  const body = clamp(content.body, BODY_MAX);
  const badge = TEMPLATE_BADGE[content.template];

  const bodyContents: Record<string, unknown>[] = [];
  if (badge) {
    bodyContents.push(badgeBox(badge));
  }
  bodyContents.push(mutedText(brandName, 'xs'));
  bodyContents.push({ type: 'text', text: title, weight: 'bold', size: 'lg', wrap: true });

  const rows = fieldRows(content);
  if (rows.length > 0) {
    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'sm',
      contents: rows,
    });
  }
  if (body.length > 0) {
    bodyContents.push({
      type: 'text',
      text: body,
      size: 'sm',
      color: MUTED,
      wrap: true,
      margin: 'md',
    });
  }

  return {
    altText: clamp(badge ? `【${badge}】${title}` : title, ALT_TEXT_MAX),
    contents: bubble({
      imageUrl: content.imageUrl,
      bodyContents,
      button: content.button,
    }),
  };
}

// 公告推播的卡片（升級自純文字）。內文刻意不放進卡片 —— 公告可能很長，
// 塞進卡片會被截掉，不如讓家長點「查看公告」進 App 看全文。
export function buildAnnouncementFlex(input: {
  scopeLabel: string;
  title: string;
  brandName: string;
  url: string | null;
}): FlexMessage {
  const title = clamp(input.title, TITLE_MAX);
  const bodyContents: Record<string, unknown>[] = [
    badgeBox(input.scopeLabel),
    mutedText(input.brandName, 'xs'),
    { type: 'text', text: title, weight: 'bold', size: 'lg', wrap: true },
  ];

  return {
    // 與升級前的純文字推播同一句 —— 通知列上看到的內容不因改版而變差。
    altText: clamp(`【${input.scopeLabel}】${title}`, ALT_TEXT_MAX),
    contents: bubble({
      imageUrl: null,
      bodyContents,
      button: input.url ? { label: '查看公告', url: input.url } : null,
    }),
  };
}

function bubble(input: {
  imageUrl: string | null;
  bodyContents: Record<string, unknown>[];
  button: { label: string; url: string } | null;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: 'bubble',
    body: { type: 'box', layout: 'vertical', spacing: 'xs', contents: input.bodyContents },
  };

  if (input.imageUrl) {
    result.hero = {
      type: 'image',
      url: input.imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
    };
  }

  if (input.button) {
    result.footer = {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: { type: 'uri', label: input.button.label, uri: input.button.url },
        },
      ],
    };
  }

  return result;
}

// 版型專屬欄位 → 卡片上的「標籤 + 值」兩欄。留空的欄位不佔一行
// （空白的「地點：」比沒有那一行更難看，也讓園所以為漏填了）。
function fieldRows(content: CampaignContent): Record<string, unknown>[] {
  return TEMPLATE_FIELDS[content.template]
    .map((key) => ({ key, value: (content.fields[key] ?? '').trim() }))
    .filter((f) => f.value.length > 0)
    .map((f) => ({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      contents: [
        { type: 'text', text: FIELD_LABELS[f.key] ?? f.key, size: 'sm', color: MUTED, flex: 2 },
        { type: 'text', text: f.value, size: 'sm', wrap: true, flex: 5 },
      ],
    }));
}

// 標記（「繳費提醒」「全校公告」）。Flex 的 box 預設撐滿整列，因此把它包在一個橫向 box 裡、
// 給 flex:0 讓它依內容縮寬，右邊補一個 filler 把它推到左側 —— 否則會變成一條通欄色塊。
function badgeBox(text: string): Record<string, unknown> {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        flex: 0,
        backgroundColor: BADGE_BG,
        cornerRadius: 'md',
        paddingAll: '4px',
        paddingStart: '10px',
        paddingEnd: '10px',
        contents: [{ type: 'text', text, size: 'xxs', color: BADGE_TEXT }],
      },
      { type: 'filler' },
    ],
  };
}

function mutedText(text: string, size: string): Record<string, unknown> {
  return { type: 'text', text: clamp(text, TITLE_MAX), size, color: MUTED };
}
