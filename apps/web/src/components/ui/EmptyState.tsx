import type { ReactNode } from 'react';

// 空狀態。要寫**發生了什麼**，不是寫「無資料」。
//
// 「今天沒有人請假」是一個好消息，「無資料」是一個系統名詞 —— 後者會讓人以為壞掉了。
// 沒有東西可看時，通常正是最該告訴使用者「所以現在可以做什麼」的時候。

interface EmptyStateProps {
  /** 一句話講現況。例：「今天沒有人請假」 */
  title: string;
  /** 補一句下一步。沒有就不寫。 */
  hint?: string;
  /** 可以做的事。通常是一顆 secondary 按鈕。 */
  action?: ReactNode;
}

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span aria-hidden className="font-serif text-3xl text-line-strong">
        〇
      </span>
      <p className="text-base font-medium text-ink-soft">{title}</p>
      {hint && <p className="text-2xs text-ink-mute">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
