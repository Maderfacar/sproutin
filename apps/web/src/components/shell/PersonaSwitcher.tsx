'use client';

import { useState } from 'react';
import { useActivePersona } from '../../lib/usePersona';
import { PERSONA_HINT, PERSONA_LABEL } from '../../lib/persona';
import { Sheet } from '../ui/Sheet';

// 身分切換鈕。**只有多重身分的人看得到**（園長兼導師、老師的小孩也在園裡）。
//
// 舊版的做法是在同一頁上貼「以老師身分／以家長身分」的標籤，讓兩種身分的內容並存
// —— 結果是每個人都要先讀標籤才知道哪一段是自己的。改成一次只給一種：
// 切下去頁籤、首頁、問的問題全部換掉，你不會搞錯自己在哪個世界。
//
// 純家長或純老師只會看到園所名字，不會看到這顆鈕 —— 給他一顆按了只有一個選項的鈕，
// 是在暗示他漏掉了什麼。
//
// **這顆鈕在每一種身分下都必須在**（Human Owner 2026-08-20 回報）：
// 原本只畫在校方那一側，於是切到家長之後就找不到路回去 —— 把人關在家長身分裡出不來。
// 切換是雙向的，出口不能只有一半。

interface PersonaSwitcherProps {
  /** 疊在封面圖上時改白字白框，否則在圖上看不見。 */
  overlay?: boolean;
}

export function PersonaSwitcher({ overlay = false }: PersonaSwitcherProps) {
  const { persona, available, setPersona, canSwitch } = useActivePersona();
  const [open, setOpen] = useState(false);

  if (!canSwitch) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`目前以${PERSONA_LABEL[persona]}身分，點這裡切換`}
        className={`tappable flex min-h-touch shrink-0 items-center gap-1.5 rounded-full border px-3 text-2xs font-bold transition ${
          overlay
            ? 'border-white/60 bg-white/10 text-white'
            : 'border-brand-primary bg-brand-wash text-brand-primary'
        }`}
      >
        {PERSONA_LABEL[persona]}
        <span aria-hidden>▾</span>
      </button>

      <Sheet open={open} title="現在以什麼身分" onClose={() => setOpen(false)}>
        <ul className="flex flex-col gap-2">
          {available.map((option) => {
            const active = option === persona;
            return (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => {
                    setPersona(option);
                    setOpen(false);
                  }}
                  aria-current={active ? 'true' : undefined}
                  className={`tappable flex min-h-touch w-full items-center gap-3 rounded-md2 border px-4 py-3 text-left ${
                    active
                      ? 'border-brand-primary bg-brand-wash text-brand-primary'
                      : 'border-line-strong bg-surface text-ink'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold">以{PERSONA_LABEL[option]}身分</span>
                    <span className="mt-0.5 block text-2xs text-ink-soft">
                      {PERSONA_HINT[option]}
                    </span>
                  </span>
                  {active && <span aria-hidden>✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
