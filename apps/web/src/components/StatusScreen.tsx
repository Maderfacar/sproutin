export type StatusKind = 'loading' | 'redirecting' | 'error';

interface StatusScreenProps {
  status: StatusKind;
  message?: string;
  // 登入失敗時顯示 LINE User ID（sub），供 seed 對映除錯（沿用 Phase 6 慣例）。
  sub?: string | null;
}

const DEFAULT_MESSAGE: Record<StatusKind, string> = {
  loading: '載入中…',
  redirecting: '導向 LINE 登入…',
  error: '發生錯誤',
};

export function StatusScreen({ status, message, sub }: StatusScreenProps) {
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
      {isError && sub && (
        <p className="max-w-sm break-all rounded-card bg-surface p-3 text-sm text-ink-soft shadow-soft">
          你的 LINE User ID（sub）：<strong className="text-ink">{sub}</strong>
        </p>
      )}
    </main>
  );
}
