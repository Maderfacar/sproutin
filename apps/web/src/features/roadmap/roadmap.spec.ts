import { describe, it, expect } from 'vitest';
import { MVP_CARDS } from '@sproutin/shared';
import { CARD_META, cardMeta } from '../dashboard/cards';
import { ROADMAP } from './roadmap';

// 產品原則：尚未完工的功能不能是點不下去的死角，必須連到預告頁（Human Owner 2026-08-17）。
// 這組測試鎖住「每張卡片都有外觀、未完工卡片都有預告內容」，避免日後新增卡片時漏掉。

describe('卡片與預告頁的對應', () => {
  it('shared 定義的每張卡片都有對應的外觀設定', () => {
    for (const card of MVP_CARDS) {
      expect(CARD_META[card.id], `缺少卡片外觀：${card.id}`).toBeDefined();
    }
  });

  it('未完工的卡片一律連到自己的預告頁，且預告內容存在', () => {
    for (const card of MVP_CARDS) {
      const meta = cardMeta(card.id);
      if (meta.enabled) continue;
      expect(meta.href, `未完工卡片缺少連結：${card.id}`).toBe(`/liff/soon/${card.id}`);
      expect(ROADMAP[card.id], `未完工卡片缺少預告內容：${card.id}`).toBeDefined();
    }
  });

  it('每則預告都寫清楚家長端與園所端各得到什麼', () => {
    for (const [id, entry] of Object.entries(ROADMAP)) {
      expect(entry.tagline.length, `預告缺少一句話說明：${id}`).toBeGreaterThan(0);
      expect(entry.forFamily.length, `預告缺少家長端說明：${id}`).toBeGreaterThan(0);
      expect(entry.forSchool.length, `預告缺少園所端說明：${id}`).toBeGreaterThan(0);
    }
  });
});
