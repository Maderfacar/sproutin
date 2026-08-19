// 進度條。旁邊**永遠**帶一個存檔回饋。
//
// 這是老師端反覆重複點的根因：點名點下去只有 chip 變色，沒有任何「存好了」的訊號，
// 老師不確定有沒有進去，就再點一次。進度與已存檔兩件事一起講才完整。

interface ProgressProps {
  value: number;
  max: number;
  /** 例：「已點名」。會組成「22 / 25 已點名」。 */
  unit: string;
  /** 還在送的時候傳 false，會顯示「儲存中…」。 */
  saved?: boolean;
}

export function Progress({ value, max, unit, saved = true }: ProgressProps) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.round((value / safeMax) * 100));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-bold tabular-nums text-ink">
          {value} / {max}
        </span>
        <span className="text-ink-soft">{unit}</span>
        <span
          className={`ml-auto text-2xs font-semibold ${saved ? 'text-good-text' : 'text-ink-mute'}`}
        >
          {saved ? '已存檔' : '儲存中…'}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={unit}
        className="h-2 overflow-hidden rounded-full border border-line bg-surface-sunk"
      >
        <span
          className="block h-full bg-brand-primary transition-[width] duration-base ease-out-soft"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
