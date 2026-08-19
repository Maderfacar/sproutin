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
  /**
   * 裡面裝的是**一組**控制項（例如分段選擇器）而不是單一輸入框。
   *
   * 這不是排版偏好，是正確性：`<label>` 會把它的文字指派給第一個可標記的後代，
   * 於是分段選擇器的第一顆按鈕會被叫成「哪一種假」而不是「病假」——
   * 螢幕閱讀器唸出來的東西是錯的（寫測試時才發現）。
   * 這種情況要用 div，群組自己的名稱由該元件的 aria-label 負責。
   */
  group?: boolean;
  children: ReactNode;
}

export function Field({ label, error, hint, group = false, children }: FieldProps) {
  const Wrapper = group ? 'div' : 'label';
  return (
    <Wrapper className="flex flex-col gap-1.5">
      <span className="text-2xs font-semibold text-ink-soft">{label}</span>
      {children}
      {error ? (
        <span className="text-2xs font-medium text-stop-text">{error}</span>
      ) : (
        hint && <span className="text-2xs text-ink-mute">{hint}</span>
      )}
    </Wrapper>
  );
}
