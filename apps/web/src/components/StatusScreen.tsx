export type StatusKind = 'loading' | 'redirecting' | 'error';

interface StatusScreenProps {
  status: StatusKind;
  message?: string;
  // 登入失敗時顯示 LINE User ID（sub），供 seed 對映除錯（沿用 Phase 6 慣例）。
  sub?: string | null;
  // 可重試的失敗（例如伺服器暫時連不上）給一顆按鈕，不必教使用者「重新整理」。
  onRetry?: () => void;
  // 整頁佔滿（**只給還沒套上外框的那幾層用**：/admin 與 /liff 的 layout、
  // 以及兩個 SessionProvider）。那時畫面上除了這個什麼都沒有，置中才對。
  //
  // 預設為 false：這個元件大多數時候是長在外框裡的（標題底下的「載入中…」、
  // 「只有園長可以…」），要求一個螢幕高會在下面拖出一大段空白。
  // 順帶：外框已經有一個 <main>，巢狀 <main> 不合法 —— 非整頁時改用 <div>。
  fullScreen?: boolean;
}

const DEFAULT_MESSAGE: Record<StatusKind, string> = {
  loading: '載入中…',
  redirecting: '導向 LINE 登入…',
  error: '發生錯誤',
};

export function StatusScreen({ status, message, sub, onRetry, fullScreen }: StatusScreenProps) {
  const isError = status === 'error';
  const Tag = fullScreen ? 'main' : 'div';
  return (
    <Tag
      className={`flex flex-col items-center justify-center gap-4 text-center ${
        fullScreen ? 'min-h-screen p-6' : 'px-6 py-10'
      }`}
    >
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
    </Tag>
  );
}
