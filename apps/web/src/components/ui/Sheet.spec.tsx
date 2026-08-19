import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sheet } from './Sheet';

describe('Sheet 底部面板', () => {
  it('open=false 時不打開', () => {
    render(
      <Sheet open={false} title="選擇孩子" onClose={() => {}}>
        內容
      </Sheet>,
    );
    expect(document.querySelector('dialog')?.open).toBe(false);
  });

  it('open=true 時以 modal 方式打開，並帶著標題', () => {
    render(
      <Sheet open title="選擇孩子" onClose={() => {}}>
        內容
      </Sheet>,
    );
    expect(document.querySelector('dialog')?.open).toBe(true);
    expect(screen.getByRole('heading', { name: '選擇孩子' })).toBeTruthy();
  });

  it('按關閉會回報，讓呼叫端把 open 改回 false', () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="選擇孩子" onClose={onClose}>
        內容
      </Sheet>,
    );
    fireEvent.click(screen.getByRole('button', { name: '關閉' }));
    expect(onClose).toHaveBeenCalled();
  });

  // Esc 與點背景走瀏覽器自己的路徑，不經過我們的 onClose。
  // 沒接這個事件的話 React 這邊的 open 會停在 true，第二次就打不開了。
  it('瀏覽器自己關掉（Esc）也會回報', () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="選擇孩子" onClose={onClose}>
        內容
      </Sheet>,
    );
    const dialog = document.querySelector('dialog');
    if (!dialog) throw new Error('找不到面板');
    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('關掉再打開仍然打得開（不會因為狀態沒同步而卡住）', () => {
    const { rerender } = render(
      <Sheet open title="選擇孩子" onClose={() => {}}>
        內容
      </Sheet>,
    );
    rerender(
      <Sheet open={false} title="選擇孩子" onClose={() => {}}>
        內容
      </Sheet>,
    );
    expect(document.querySelector('dialog')?.open).toBe(false);
    rerender(
      <Sheet open title="選擇孩子" onClose={() => {}}>
        內容
      </Sheet>,
    );
    expect(document.querySelector('dialog')?.open).toBe(true);
  });
});
