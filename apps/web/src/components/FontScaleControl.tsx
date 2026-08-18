'use client';

import { useEffect, useState } from 'react';
import {
  FONT_SCALE_OPTIONS,
  applyFontScale,
  readFontScale,
  type FontScale,
} from '../lib/fontScale';

// 家長端的字體大小開關（Human Owner 2026-08-18 定案：只放手機端、只記在這支瀏覽器上）。
// 每個選項用自己的比例把「標準／中／大」三個字畫出來 —— 按下去之前就看得出差別。
export function FontScaleControl() {
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

  return (
    <div>
      <p className="eyebrow mb-1">字體大小</p>
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
                <span className="text-3xs leading-tight">{option.hint}</span>
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
