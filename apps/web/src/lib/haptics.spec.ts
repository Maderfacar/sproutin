import { describe, it, expect, vi, afterEach } from 'vitest';
import { tapFeedback } from './haptics';

// 觸覺回饋是加分項不是功能：**任何情況下都不可以因為它而壞掉**。
// iOS 沒有 Vibration API、某些瀏覽器在使用者還沒互動過時會丟錯 ——
// 這兩種都必須安靜地什麼都不做。

const original = Object.getOwnPropertyDescriptor(navigator, 'vibrate');

function setVibrate(value: unknown): void {
  Object.defineProperty(navigator, 'vibrate', { value, configurable: true, writable: true });
}

afterEach(() => {
  if (original) {
    Object.defineProperty(navigator, 'vibrate', original);
  } else {
    // @ts-expect-error 測試用：把測試裝上去的屬性拿掉
    delete navigator.vibrate;
  }
});

describe('tapFeedback', () => {
  it('有 API 時震一下，而且是「碰一下」的長度不是通知的長度', () => {
    const vibrate = vi.fn();
    setVibrate(vibrate);

    tapFeedback();

    expect(vibrate).toHaveBeenCalledWith(10);
  });

  // iOS 走的就是這條。刻意不做替代方案（那要拿隱藏元件去騙 Taptic Engine）。
  it('沒有 API（iOS）時安靜地什麼都不做', () => {
    setVibrate(undefined);
    expect(() => tapFeedback()).not.toThrow();
  });

  it('API 丟錯時也不會把呼叫端一起弄壞', () => {
    setVibrate(() => {
      throw new Error('not allowed before user gesture');
    });
    expect(() => tapFeedback()).not.toThrow();
  });
});
