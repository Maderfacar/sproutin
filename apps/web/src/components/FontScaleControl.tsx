'use client';

import { useEffect, useState } from 'react';
import {
  FONT_SCALE_OPTIONS,
  applyFontScale,
  readFontScale,
  type FontScale,
} from '../lib/fontScale';

// 字體大小開關（Human Owner 2026-08-18 定案：只記在這支瀏覽器上；2026-08-19 追加：後台也要有）。
// 每個選項用自己的比例把「標準／中／大」三個字畫出來 —— 按下去之前就看得出差別。
//
// 兩種密度共用同一個元件：
//   家長手機的「我的」→ 完整版（有每個選項的說明、有一句話講清楚只影響這支手機）。
//   後台左欄 → compact：欄寬只有 14.5rem，說明文字擠成三行反而看不懂，只留三顆按鈕。
// 放大的實際效果兩邊一樣（改的是 html 的 font-size，全站等比放大，見 lib/fontScale）。
export function FontScaleControl({ compact = false }: { compact?: boolean }) {
  const [scale, setScale] = useState<FontScale>('base');
  const [remembered, setRemembered] = useState(true);

  // 開機腳本已經在首次繪製前把 html 設好了，這裡只是把 UI 對回目前的值。
  useEffect(() => {
    setScale(readFontScale());
  }, []);

  function choose(next: FontScale): void {
    setScale(next);
    setRemembered(applyFontScale(next));
  }

  if (compact) {
    return (
      <div>
        <p className="text-2xs font-semibold text-ink-mute mb-1.5">字體大小</p>
        <div role="radiogroup" aria-label="字體大小" className="flex gap-1.5">
          {FONT_SCALE_OPTIONS.map((option) => {
            const active = option.id === scale;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(option.id)}
                className={`tappable flex-1 rounded-md2 border py-1.5 leading-none transition ${
                  active
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-line text-ink-soft hover:border-brand-primary/50'
                }`}
              >
                <span
                  className="font-serif font-semibold"
                  style={{ fontSize: `${option.percent}%` }}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
        {!remembered && (
          <p className="mt-2 text-2xs leading-relaxed text-ink-soft">
            這個瀏覽器不讓我們記住設定，重新開啟後會回到標準。
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-2xs font-semibold text-ink-mute mb-1">字體大小</p>
      <div className="border-t border-line pt-3">
        <div role="radiogroup" aria-label="字體大小" className="grid grid-cols-3 gap-2">
          {FONT_SCALE_OPTIONS.map((option) => {
            const active = option.id === scale;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(option.id)}
                className={`flex flex-col items-center gap-1 rounded-md2 border px-2 py-3 transition ${
                  active
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-line bg-surface text-ink-soft hover:border-brand-primary/50'
                }`}
              >
                <span
                  className="font-serif font-semibold leading-none text-ink"
                  style={{ fontSize: `${option.percent}%` }}
                >
                  {option.label}
                </span>
                <span className="text-2xs leading-tight">{option.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
          {remembered
            ? '只會改變這支手機上看到的大小，不影響其他家長。'
            : '這個瀏覽器不讓我們記住設定：現在已經變大了，但重新開啟後會回到標準。'}
        </p>
      </div>
    </div>
  );
}
