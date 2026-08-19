'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// 底部面板。短任務不跳頁，從底部滑上來。
//
// 為什麼要有這個東西：請假申請、選孩子、選班級、確認送出這些事做完就結束，
// 跳到另一頁再跳回來會讓人失去「我剛剛在哪」的感覺 —— 這正是「操作起來像網頁不像 app」
// 最主要的來源。面板蓋在原地，關掉就回到剛剛那一頁，動線不斷。
//
// 用原生 <dialog> 而不是自己刻浮層：焦點鎖定、Esc 關閉、背景不可點、
// 螢幕閱讀器的 modal 語意全部是瀏覽器內建的，自己刻一定會漏掉其中幾樣。
// 動畫在 globals.css 的 .sheet（位移用 px 不用 %，內容多寡不該改變滑上來的速度）。

interface SheetProps {
  open: boolean;
  /** 標題。面板一定要有標題，否則滑上來的東西沒有名字。 */
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ open, title, onClose, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // showModal() 對已經開著的 dialog 會丟錯，close() 對已關的則是靜默無效
    // —— 所以開之前一定要問一次現在的狀態，不能無條件呼叫。
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Esc 與點背景關閉走的是瀏覽器自己的路徑，不會經過我們的 onClose
  // —— 沒有接這個事件，React 這邊的 open 會停在 true，第二次就打不開了。
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = (): void => onClose();
    el.addEventListener('close', handle);
    return () => el.removeEventListener('close', handle);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      // 點背景關閉。點在面板本身不該關，所以只認 target 正好是 dialog 的那一下。
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-panel rounded-t-tile border border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-lift">
        <div className="flex items-center gap-3 px-5 pb-3 pt-3">
          <span aria-hidden className="mx-auto h-1 w-9 rounded-full bg-line-strong" />
        </div>
        <div className="flex items-center gap-3 px-5 pb-3">
          <h2 className="min-w-0 flex-1 font-serif text-xl font-bold tracking-tight text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="tappable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </dialog>
  );
}
