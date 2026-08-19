'use client';

// 分段選擇器。**原生 select 在本站已退役** —— 長輩點下拉很痛苦，而且在點開之前
// 看不到有哪些選項，等於每次都要先探索一次。
//
// 分界線：三個以內的選項用這個直接攤開；超過三個改用底部面板（components/ui/Sheet）選。
// 硬把八個班塞進分段選擇器只會擠成一團，那比下拉更糟。

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  /** 給螢幕閱讀器用的群組名稱。例：「選擇班級」 */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-md2 border border-line bg-surface-sunk p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`tappable min-h-touch flex-1 rounded-[9px] px-2 py-2 text-sm transition ${
              active ? 'bg-surface font-bold text-ink shadow-soft' : 'font-medium text-ink-soft'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
