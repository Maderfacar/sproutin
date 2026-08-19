'use client';

// 錯誤提示。要說**怎麼辦**，不是只說失敗。
//
// 「操作失敗」對使用者沒有任何用處 —— 他不知道是自己填錯、網路斷了、還是系統壞了，
// 也不知道現在該重試還是去問老師。所以這個元件強制要有訊息，並且盡量帶一顆重試。

interface ErrorNoticeProps {
  /** 使用者看得懂的話。技術細節留在 log。 */
  message: string;
  /** 有得重試才給重試。沒有就不給，不要放一顆按了沒用的按鈕。 */
  onRetry?: () => void;
}

export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md2 border border-stop-edge bg-stop-wash px-4 py-3 text-sm text-stop-text"
    >
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="tappable shrink-0 font-bold underline underline-offset-2"
        >
          再試一次
        </button>
      )}
    </div>
  );
}
