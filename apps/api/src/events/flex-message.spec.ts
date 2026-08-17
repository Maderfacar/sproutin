import { buildAnnouncementFlex, buildCampaignFlex } from './flex-message';
import { TITLE_MAX, type CampaignContent } from '../push-campaigns/push-campaign.types';

// Flex 卡片產生器（純函式）。重點在：欄位留空不佔一行、超長內容先截斷（不讓 LINE 整則拒絕）、
// altText 必須自成完整訊息、以及 JSON 遠低於已查證的 10KB 上限。

function content(over: Partial<CampaignContent> = {}): CampaignContent {
  return {
    template: 'GENERAL',
    title: '本週五園外教學延期',
    body: '因颱風影響，延至下週三。',
    imageUrl: null,
    fields: {},
    button: null,
    ...over,
  };
}

function json(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

describe('buildCampaignFlex', () => {
  it('一般通知：園名 + 標題 + 內文，沒有標記也沒有按鈕', () => {
    const flex = buildCampaignFlex(content(), '晴光幼兒園');

    expect(flex.altText).toBe('本週五園外教學延期');
    expect(json(flex.contents)).toContain('晴光幼兒園');
    expect(json(flex.contents)).toContain('因颱風影響');
    expect(flex.contents.footer).toBeUndefined();
    expect(flex.contents.hero).toBeUndefined();
  });

  it('活動通知：日期與地點各一行；沒填的欄位不佔一行', () => {
    const flex = buildCampaignFlex(
      content({ template: 'EVENT', fields: { eventDate: '9/20（六）09:30', eventPlace: '' } }),
      '晴光幼兒園',
    );

    const text = json(flex.contents);
    expect(text).toContain('日期');
    expect(text).toContain('9/20（六）09:30');
    expect(text).not.toContain('地點'); // 空白的「地點：」比沒有那一行更難看
  });

  it('繳費提醒：卡片頂端有標記，altText 也帶上它', () => {
    const flex = buildCampaignFlex(
      content({ template: 'PAYMENT', title: '9 月份月費', fields: { amount: 'NT$ 8,500' } }),
      '晴光幼兒園',
    );

    expect(flex.altText).toBe('【繳費提醒】9 月份月費');
    expect(json(flex.contents)).toContain('繳費提醒');
    expect(json(flex.contents)).toContain('NT$ 8,500');
  });

  it('有圖片 → 放成 hero；有按鈕 → 放成 footer 的 uri action', () => {
    const flex = buildCampaignFlex(
      content({
        imageUrl: 'https://blob.example/cover.png',
        button: { label: '查看活動詳情', url: 'https://liff.line.me/liff-1/announcement' },
      }),
      '晴光幼兒園',
    );

    expect(flex.contents.hero).toMatchObject({ type: 'image', url: 'https://blob.example/cover.png' });
    expect(json(flex.contents)).toContain('"type":"uri"');
    expect(json(flex.contents)).toContain('https://liff.line.me/liff-1/announcement');
    expect(json(flex.contents)).toContain('查看活動詳情');
  });

  // altText 的官方上限查不到 → 一律先截斷,無論真上限是多少都安全。
  it('超長標題 → 截斷並補省略號，altText 不會無限長', () => {
    const flex = buildCampaignFlex(content({ title: 'ㄅ'.repeat(TITLE_MAX + 50) }), '晴光幼兒園');

    expect(flex.altText.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(flex.altText.endsWith('…')).toBe(true);
  });

  // 已查證：定義一個 bubble 的 JSON 上限 10KB。
  it('最長允許的內容仍遠低於 LINE 的 10KB 上限', () => {
    const flex = buildCampaignFlex(
      content({
        template: 'PAYMENT',
        title: 'ㄅ'.repeat(TITLE_MAX),
        body: 'ㄆ'.repeat(500),
        imageUrl: 'https://blob.example/cover.png',
        fields: { amount: 'ㄇ'.repeat(60), dueDate: 'ㄈ'.repeat(60) },
        button: { label: '查看通知', url: 'https://liff.line.me/liff-1' },
      }),
      '晴光幼兒園',
    );

    expect(Buffer.byteLength(json(flex.contents), 'utf8')).toBeLessThan(10 * 1024);
  });
});

describe('buildAnnouncementFlex', () => {
  it('altText 與升級成卡片之前的純文字推播一致', () => {
    const flex = buildAnnouncementFlex({
      scopeLabel: '全校公告',
      title: '10 月份行事曆已公布',
      brandName: '晴光幼兒園',
      url: 'https://liff.line.me/liff-1/announcement',
    });

    expect(flex.altText).toBe('【全校公告】10 月份行事曆已公布');
    expect(json(flex.contents)).toContain('查看公告');
  });

  it('沒有網址（liffId 未設定）→ 不放按鈕', () => {
    const flex = buildAnnouncementFlex({
      scopeLabel: '班級公告',
      title: '明天請帶畫具',
      brandName: '晴光幼兒園',
      url: null,
    });

    expect(flex.contents.footer).toBeUndefined();
  });
});
