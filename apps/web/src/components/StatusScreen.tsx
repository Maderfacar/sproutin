export type StatusKind = 'loading' | 'redirecting' | 'error';

interface StatusScreenProps {
  status: StatusKind;
  message?: string;
  // 登入失敗時顯示 LINE User ID（sub），供 seed 對映除錯（沿用 Phase 6 慣例）。
  sub?: string | null;
  // 可重試的失敗（例如伺服器暫時連不上）給一顆按鈕，不必教使用者「重新整理」。
  onRetry?: () => void;
}

const DEFAULT_MESSAGE: Record<StatusKind, string> = {
  loading: '載入中…',
  redirecting: '導向 LINE 登入…',
  error: '發生錯誤',
};

export function StatusScreen({ status, message, sub, onRetry }: StatusScreenProps) {
  const isError = status === 'error';
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      {isError ? (
        <span className="text-4xl" aria-hidden>
          🌱
        </span>
      ) : (
        <div
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-secondary border-t-brand-primary"
          aria-hidden
        />
      )}
      <p className={isError ? 'font-semibold text-red-600' : 'text-ink-soft'}>
        {message ?? DEFAULT_MESSAGE[status]}
      </p>
      {isError && onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary text-sm">
          再試一次
        </button>
      )}
      {isError && sub && (
        <p className="max-w-sm break-all rounded-card bg-surface p-3 text-sm text-ink-soft shadow-soft">
          你的 LINE User ID（sub）：<strong className="text-ink">{sub}</strong>
        </p>
      )}
    </main>
  );
}
