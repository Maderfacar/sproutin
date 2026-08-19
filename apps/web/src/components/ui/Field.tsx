import type { ReactNode } from 'react';

// 表單欄位的外框：標籤 + 控制項 + （出錯時）一行說明。
//
// 錯誤訊息貼在欄位下面而不是頁面頂端 —— 頁面頂端的紅字在手機上常常已經捲出畫面，
// 使用者只知道送不出去，不知道哪裡錯。

interface FieldProps {
  label: string;
  /** 出錯時的說明。要寫「怎麼辦」，不是只寫「失敗」。 */
  error?: string;
  /** 平常的提示。例：「送出後老師會收到」 */
  hint?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-2xs font-semibold text-ink-soft">{label}</span>
      {children}
      {error ? (
        <span className="text-2xs font-medium text-stop-text">{error}</span>
      ) : (
        hint && <span className="text-2xs text-ink-mute">{hint}</span>
      )}
    </label>
  );
}
