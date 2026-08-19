import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// globals:false → RTL 不會自動註冊 afterEach cleanup,手動註冊避免測試間 DOM 殘留。
afterEach(() => {
  cleanup();
});

// jsdom 沒有實作 <dialog> 的 showModal / close（到 jsdom 25 仍然沒有）。
// 底部面板（components/ui/Sheet）刻意用原生 dialog —— 焦點鎖定、Esc、背景不可點
// 全部交給瀏覽器，自己刻一定會漏。所以這裡補的是**測試環境的缺口**，不是產品的降級：
// 只做「open 屬性」與「close 事件」這兩件測試真正需要驗的事，
// 焦點與背景那些留給真機驗收。
const dialog = globalThis.HTMLDialogElement?.prototype;
if (dialog && typeof dialog.showModal !== 'function') {
  dialog.showModal = function showModal(this: HTMLDialogElement): void {
    this.open = true;
  };
  dialog.show = function show(this: HTMLDialogElement): void {
    this.open = true;
  };
  dialog.close = function close(this: HTMLDialogElement, returnValue?: string): void {
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
